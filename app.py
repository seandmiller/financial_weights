from flask import Flask, render_template, jsonify, request
import yfinance as yf
from datetime import datetime, timedelta
from flask_socketio import SocketIO
from static.components.helper import Static_helpers
import time
import threading
import pytz

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
helpers = Static_helpers()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stock/<ticker>')
def get_stock_data(ticker):
    
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        if not info:
            raise ValueError(f"No information found for ticker {ticker}")
        financials = stock.quarterly_financials
        balance_sheet = stock.quarterly_balance_sheet
        cash_flow = stock.quarterly_cashflow
        
        if financials.empty or balance_sheet.empty or cash_flow.empty:
            raise ValueError(f"Incomplete financial data for ticker {ticker}")
       
        quarterly_data, margin_data, balance_sheet_data = helpers._orginize_data(balance_sheet=balance_sheet, cash_flow=cash_flow, financials=financials)
        
        quarterly_data.sort(key=lambda x: x['date'], reverse=True)
        margin_data.sort(key=lambda x: x['date'], reverse=True)
        balance_sheet_data.sort(key=lambda x: x['date'], reverse=True)
        return_data = {
            'companyName': info.get('longName', 'N/A'),
            'stockPrice': info.get('currentPrice', 'N/A'),
            'peRatio': info.get('trailingPE', 'N/A'),
            'industry': info.get('industry', 'N/A'),
            'description': info.get('longBusinessSummary', 'N/A'),
            'quarterlyData': quarterly_data,
            'marginData': margin_data,
            'balanceSheetData': balance_sheet_data
        }
        cleaned_data = helpers.replace_nan_with_null(return_data)
        return jsonify(cleaned_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 400



@app.route('/top_movers')
def get_top_movers():
    try:
        tickers = ["AAPL", "GOOGL", "MSFT", "AMZN", "FB", "TSLA", "NVDA", "JPM", "JNJ", "V"]
        movers_data = []
        for ticker in tickers:
            stock = yf.Ticker(ticker)
            info = stock.info
            if info:
                price = info.get('currentPrice', 0)
                previous_close = info.get('previousClose', 0)
                if price and previous_close:
                    change = price - previous_close
                    percent_change = (change / previous_close) * 100
                    movers_data.append({
                        'symbol': ticker,
                        'price': price,
                        'change': change,
                        'percentChange': percent_change
                    })
        movers_data.sort(key=lambda x: abs(x['percentChange']), reverse=True)
        return jsonify(movers_data)  
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
@app.route('/stock/<ticker>/price/<time_range>')
def get_stock_price_data(ticker, time_range):
    try:
        stock = yf.Ticker(ticker)
        end_date = datetime.now()
        
        if time_range == 'day':
            start_date = end_date - timedelta(days=1)
            interval = "5m"
        elif time_range == 'month':
            start_date = end_date - timedelta(days=30)
            interval = "1d"
        elif time_range == 'year':
            start_date = end_date - timedelta(days=365)
            interval = "1d"
        elif time_range == 'ytd':
            start_date = datetime(end_date.year, 1, 1)
            interval = "1d"
        else:
            raise ValueError("Invalid time range")

        historical_data = stock.history(start=start_date, end=end_date, interval=interval)
        
        if historical_data.empty:
            print('emptyo') 
            last_data = stock.history(period="1d")
            if last_data.empty:
                return jsonify({
                    'error': 'No recent data available. The market might be closed.',
                    'priceData': [],
                    'companyName': stock.info.get('longName', 'N/A'),
                    'currentPrice': stock.info.get('regularMarketPrice', 'N/A')
                }), 200  
            else:
                last_price = last_data['Close'].iloc[-1]
                last_date = last_data.index[-1]
                return jsonify({
                    'priceData': [{
                        'date': last_date.strftime('%Y-%m-%d %H:%M:%S'),
                        'price': last_price
                    }],
                    'companyName': stock.info.get('longName', 'N/A'),
                    'currentPrice': last_price
                })


        price_data = []
        for index, row in historical_data.iterrows():
            # if time_range in ['day', 'week', 'month'] and not helpers._is_market_open(index):
            #     continue
            
            price_data.append({
                'date': index.strftime('%Y-%m-%d %H:%M:%S'),
                'price': row['Close']
            })

        return jsonify({
            'priceData': price_data,
            'companyName': stock.info.get('longName', 'N/A'),
            'currentPrice': stock.info.get('currentPrice', 'N/A')
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

 


client_stocks = {}
client_threads = {}

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    sid = request.sid
    if sid in client_stocks:
        del client_stocks[sid]
    if sid in client_threads:
        client_threads[sid].stop()
        del client_threads[sid]

@socketio.on('start_stream')
def handle_start_stream(data):
    ticker = data['ticker']
    sid = request.sid
    if sid in client_threads:
        client_threads[sid].stop()
        del client_threads[sid]
    
    client_stocks[sid] = ticker
    thread = threading.Thread(target=background_task, args=(ticker, sid))
    thread.daemon = True
    thread.start()
    client_threads[sid] = thread

def background_task(ticker, sid):
    while sid in client_stocks and client_stocks[sid] == ticker:
        try:
         if helpers._is_market_open(datetime.now(pytz.utc)):
            stock = yf.Ticker(ticker)
            current_price = stock.info.get('currentPrice', 'N/A')
            if current_price is not None and helpers._is_price_valid(current_price, ticker):
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                socketio.emit('price_update', {'price': current_price, 'timestamp': timestamp})
        except Exception as e:
            print(f"Error fetching real-time data: {str(e)}")
        time.sleep(10) 

    

if __name__ == '__main__':
    socketio.run(app, debug=True)