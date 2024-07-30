import math
import statistics
from collections import deque
from datetime import datetime, time
import pytz




class Fetch_Methods:
    def __init__(self):
        pass 


class Static_helpers:
    def __init__(self):
        self.recent_prices = deque(maxlen=10)
        self.MAX_DEVIATION = 0.06
        self.ticker = ""
    def _is_price_valid(self, new_price, ticker):
        if self.ticker != ticker:
            self.recent_prices = deque(maxlen=10)
            self.ticker = ticker
            print('reset', ticker)
        if len(self.recent_prices) > self.recent_prices.maxlen:
            self.recent_prices = self.recent_prices[1:] + [new_price]
        else:
            self.recent_prices.append(new_price)
    
        avg_price = statistics.mean(self.recent_prices)
        deviation = abs(new_price - avg_price) / avg_price
        if deviation > self.MAX_DEVIATION:
            print(f"Price deviation too high. New price: {new_price}, Avg price: {avg_price}")
            self.recent_prices.pop()
            return False
        return True
    def _is_market_open(self, dt):
        pacific = pytz.timezone('US/Pacific')
        dt = dt.astimezone(pacific)
        if dt.weekday() >= 5:
           return False
        market_start = time(6, 30)
        market_end = time(13, 0)
        return market_start <= dt.time() <= market_end
    
    def replace_nan_with_null(self, obj):
      if isinstance(obj, float) and math.isnan(obj):
         return None
      elif isinstance(obj, dict):
         return {k: self.replace_nan_with_null(v) for k, v in obj.items()}
      elif isinstance(obj, list):
         return [self.replace_nan_with_null(v) for v in obj]
      return obj
    def not_number(self,num):
       return math.isnan(num)

    def _orginize_data(self, balance_sheet, cash_flow, financials):
        quarterly_data = []
        margin_data = []
        balance_sheet_data = []
        for date in financials.columns[:4]:  
            financial_data = financials[date]
            balance_sheet_data_quarter = balance_sheet[date] if date in balance_sheet.columns else {}
            cash_flow_data = cash_flow[date] if date in cash_flow.columns else {}
            revenue = float(financial_data.get('Total Revenue', 0))
            gross_profit = float(financial_data.get('Gross Profit', 0))
            operating_income = float(financial_data.get('Operating Income', 0))
            net_income = float(financial_data.get('Net Income', 0))
            operating_cash_flow = float(cash_flow_data.get('Operating Cash Flow', 0))
            capital_expenditure = float(cash_flow_data.get('Capital Expenditure', 0))
            free_cash_flow = operating_cash_flow + capital_expenditure if not (self.not_number(operating_cash_flow) or self.not_number(capital_expenditure)) else None
            
            current_assets = balance_sheet_data_quarter.get('Total Current Assets', 
                             balance_sheet_data_quarter.get('CurrentAssets',
                             balance_sheet_data_quarter.get('Current Assets', 0)))
            
            current_liabilities = balance_sheet_data_quarter.get('Total Current Liabilities', 
                                  balance_sheet_data_quarter.get('CurrentLiabilities',
                                  balance_sheet_data_quarter.get('Current Liabilities', 0)))
            
            total_assets = balance_sheet_data_quarter.get('Total Assets', 
                           balance_sheet_data_quarter.get('TotalAssets', 0))
            
            total_liabilities = balance_sheet_data_quarter.get('Total Liabilities Net Minority Interest', 
                                balance_sheet_data_quarter.get('TotalLiabilities',
                                balance_sheet_data_quarter.get('Total Liabilities', 0)))
            
            quarterly_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'revenue': revenue,
                'operatingIncome': operating_income,
                'netIncome': net_income,
                'cashBalance': float(balance_sheet_data_quarter.get('Cash And Cash Equivalents', 0)),
                'operatingCashFlow': operating_cash_flow,
                'freeCashFlow': free_cash_flow
            })
            
            margin_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'grossMargin': (gross_profit / revenue * 100) if revenue else None,
                'operatingMargin': (operating_income / revenue * 100) if revenue else None,
                'netIncomeMargin': (net_income / revenue * 100) if revenue else None
            })
            
            balance_sheet_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'currentAssets': float(current_assets),
                'currentLiabilities': float(current_liabilities),
                'longTermAssets': float(total_assets) - float(current_assets),
                'longTermLiabilities': float(total_liabilities) - float(current_liabilities)
            })
        return quarterly_data, margin_data, balance_sheet_data
