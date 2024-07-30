import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import tensorflow as tf


data = pd.read_csv('fwdata.csv')


X = data.drop(['Company', 'FinancialHealthScore'], axis=1)
y = data['FinancialHealthScore']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)


scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(1)
])


model.compile(optimizer='adam', loss='mse', metrics=['mae'])


history = model.fit(
    X_train_scaled, y_train,
    epochs=275,
    batch_size=32,
    validation_split=0.2,
    verbose=1
)

test_loss, test_mae = model.evaluate(X_test_scaled, y_test, verbose=0)
print(f"Test Mean Absolute Error: {test_mae:.2f}")

# model.save('fw.keras')

predictions = model.predict(X_test_scaled)


for i in range(len(predictions)):

  print(f"Actual: {y_test.iloc[i]:.2f}, Predicted: {predictions[i][0]:.2f}")