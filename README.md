# Tesla & V2C Mission Control — Home Assistant Dashboard

An ultra-modern, interactive Tesla and EV Home Charging Mission Control dashboard for Home Assistant, featuring 2D vehicle telemetry, liquid charging animations, real-time government fuel economic benchmarking, and solar charging analytics.

---

## 📦 What's Included

1. **`tesla_mission_control.yaml`**: The complete Lovelace View YAML containing all 5 cards in a responsive vertical stack.
2. **`tesla_fuel_savings.yaml`**: Companion Home Assistant YAML package to pull real-time Spanish Government MITECO fuel prices (`1.805 €/L`) via cached REST API.

---

## 🎛️ Dashboard Structure (5 Cards)

* **Card 0: Tesla Hub (2D Interactive Highland Cockpit)**
  * Custom top-down vector vehicle display (lock status, frunk, trunk, sentry).
  * 4-tire real-time pressure monitoring with color thresholds.
  * Interactive drag-and-drop battery charge limit slider (Tesla mobile app style).
  * Liquid GPU-accelerated wave charging flow animation when plugged in.
  * Real-time session stats (+energy added, +range added).
* **Card 1: 3D Interactive Vehicle Model**
  * Powered by `custom:tesla-view-card` with 3D orbit controls and climate preconditioning.
* **Card 2: V2C Smart EVSE Charging Controls**
  * Profile selectors: Solar Only, FV + Min, and Boost.
  * Amperage presets (6A to 29A).
  * Dynamic power modulation toggle and session lock.
* **Card 3: Car Charging & Energy Costs**
  * Session cost and energy breakdown.
  * Solar vs Grid electricity split (`☀️ Solar Saved`).
  * Hourly charging session inspector and historical monthly selector.
* **Card 4: Economic Fuel & Energy Savings Hub**
  * Live comparison between driving electric vs petrol.
  * Spanish Government MITECO real-time fuel price integration.
  * ICE baseline selector: `4.5L Compact`, `6.0L Saloon ★`, `7.5L SUV`.
  * 4 horizons: **Lifetime Mileage** (14,997 km), **Distance Driven This Month** (125 km), **Remaining Range** (339 km), and **Last Charge** (+17 km).
  * Net money saved, petrol displaced (liters), and avoided CO₂ emissions (tonnes).

---

## ⚙️ Prerequisites (HACS Frontend Cards)

Before importing the view, install these cards from HACS:
* **[button-card](https://github.com/custom-cards/button-card)** (`custom:button-card`) — *Required for Cards 0, 2, 3, and 4.*
* **[tesla-view-card](https://github.com/alandtse/tesla-view-card)** (`custom:tesla-view-card`) — *Required for Card 1 (3D model). If you don't use this, you can remove Card 1 or replace it with a picture-elements card.*

---

## 🔌 Entity Mapping Guide

Replace the following entity names in the YAML with your own vehicle and charger entities:

### 1. Tesla Vehicle Telemetry
| Dashboard Entity | Purpose | Typical HA Entity |
| :--- | :--- | :--- |
| `sensor.tesla_ble_garage_charge_level` | Battery SoC (%) | `sensor.<car>_battery_level` |
| `sensor.tesla_ble_garage_range` | Rated Range (km) | `sensor.<car>_battery_range` |
| `number.tesla_ble_garage_charging_limit` | Charge Limit (%) | `number.<car>_charge_limit` |
| `sensor.tesla_ble_garage_odometer` | Total Odometer (km) | `sensor.<car>_odometer` |
| `lock.tesla_ble_garage_lock_car` | Vehicle Lock | `lock.<car>_doors` |
| `cover.tesla_ble_garage_boot` | Rear Trunk | `cover.<car>_trunk` |
| `cover.tesla_ble_garage_frunk` | Front Frunk | `cover.<car>_frunk` |
| `switch.tesla_ble_garage_sentry_mode` | Sentry Mode | `switch.<car>_sentry_mode` |
| `switch.tesla_ble_garage_climate` | Climate Power | `climate.<car>_climate` |
| `number.tesla_ble_garage_climate_temperature` | Climate Target Temp | Climate entity attribute |
| `sensor.tesla_ble_garage_tyre_pressure_*` | 4 Tire Pressures (bar) | `sensor.<car>_tire_pressure_*` |
| `sensor.tesla_ble_garage_charge_energy_added` | Energy Added (kWh) | `sensor.<car>_charge_energy_added` |
| `sensor.tesla_ble_garage_charge_distance_added`| Range Added (km) | `sensor.<car>_charge_distance_added`|

### 2. Fuel Savings & Helpers
| Dashboard Entity | Purpose | Setup |
| :--- | :--- | :--- |
| `sensor.fuel_price_gasolina_95` | Live Gas 95 Price (€/L) | Use provided `tesla_fuel_savings.yaml` |
| `sensor.tesla_monthly_mileage` | Monthly Driven Km | Create a `utility_meter` helper tracking your odometer with `cycle: monthly` |

### 3. EV Charger (V2C Trydan / Generic Wallbox)
*Entities starting with `sensor.evse_trydan_*` belong to the V2C Trydan integration. If you use a Tesla Wall Connector or Easee/Wallbox, map your charger's power/current entities or remove Cards 2 & 3.*

---

## 🚀 How to Install

1. **Install HACS dependencies:** Install `button-card` and `tesla-view-card`.
2. **Add Fuel Pricing Sensor (Optional):**
   Copy `tesla_fuel_savings.yaml` into your Home Assistant `config/packages/` folder and reload Home Assistant YAML.
3. **Add Monthly Mileage Helper:**
   Go to **Settings → Devices & Services → Helpers → Create Helper → Utility Meter**:
   - Name: `Monthly Mileage`
   - Input Sensor: your car's odometer sensor
   - Reset Cycle: `Monthly`
4. **Import Dashboard View:**
   - Open your Home Assistant dashboard.
   - Click the 3 dots (top right) → **Edit Dashboard** → 3 dots → **Raw Configuration Editor**.
   - Paste the contents of `tesla_mission_control.yaml` under `views:`.
   - Click **Save**.
