from app.strategies.examples.sma_cross import SMACrossStrategy

def build_registry(market_data):
    return {
        SMACrossStrategy.key: lambda: SMACrossStrategy(market_data),
    }
