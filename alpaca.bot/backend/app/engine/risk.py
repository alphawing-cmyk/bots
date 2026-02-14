from dataclasses import dataclass

@dataclass
class RiskLimits:
    max_position_qty: float = 100
    max_orders_per_run: int = 20

def validate_signal(signal, limits: RiskLimits) -> None:
    if signal.qty <= 0:
        raise ValueError("qty must be > 0")
    if signal.qty > limits.max_position_qty:
        raise ValueError(f"qty exceeds max_position_qty ({limits.max_position_qty})")
