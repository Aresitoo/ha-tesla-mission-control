# ⚡ Tesla & V2C Mission Control: Home Assistant Dashboard



A Tesla and EV home charging dashboard for Home Assistant, featuring a 2D vehicle cockpit, real-time telemetry, liquid charging animations, smart V2C Trydan dynamic EVSE modulation, fuel economic benchmarking, and an early payoff ROI dossier.



![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.x%2B-blue.svg?logo=home-assistant)

![License](https://img.shields.io/badge/license-MIT-green.svg)

![HACS Cards](https://img.shields.io/badge/Required%20Cards-1%20(button--card)-orange.svg)



---



## 📸 Visual Showcase



<p align="center">

  <img src="assets/tesla_cockpit_hero.png" width="24%" alt="Tesla 2D Interactive Cockpit Telemetry" />

  <img src="assets/tesla_charging_v2c.png" width="24%" alt="V2C Smart EVSE & Charging Costs" />

  <img src="assets/tesla_fuel_savings.png" width="24%" alt="Economic Fuel & Energy Savings Hub" />

  <img src="assets/tesla_early_payoff.png" width="24%" alt="Capital Recovery & Early Payoff Dossier" />

</p>



---



## 📦 What's Included



1. **`tesla_mission_control.yaml`**: The complete Lovelace View YAML containing all 5 cards in a responsive vertical stack.

2. **`tesla_fuel_savings.yaml`**: Companion Home Assistant YAML package to pull real-time Spanish Government MITECO fuel prices (`1.809 €/L`) via cached REST API.



---



## 🎛️ Dashboard Structure (5 Cards)



* **Card 0: Mr. White: Interactive Highland Cockpit (2D)**

  * Custom top-down vector vehicle display (lock status, frunk, trunk, sentry mode).

  * 4-tire real-time pressure monitoring with color thresholds.

  * Interactive drag-and-drop battery charge limit slider (Tesla mobile app style).

  * Liquid GPU-accelerated wave charging flow animation when plugged in.

  * Real-time session stats (+energy added, +range added).

  * Integrated climate control pill with quick temperature adjustments.

* **Card 1: V2C Trydan Smart EVSE Charging Controls**

  * Profile selectors: Solar Only, FV + Min, and Boost.

  * Amperage presets (6A to 29A).

  * Dynamic power modulation toggle and session lock.

* **Card 2: Car Charging & Energy Costs**

  * Session cost and energy breakdown.

  * Solar vs Grid electricity split (`☀️ Solar Saved`).

  * Hourly charging session inspector and historical monthly selector.

* **Card 3: Economic Fuel & Energy Savings Hub**

  * Live comparison between driving electric vs petrol.

  * Spanish Government MITECO real-time fuel price integration.

  * ICE baseline selector: `4.5L Compact`, `6.0L Saloon ★`, `7.5L SUV`.

  * 4 horizons: Lifetime Mileage (15,187 km), This Month, Current Range, and Last Charge.

  * Net money saved, petrol displaced (liters), and avoided CO₂ emissions (tonnes).

* **Card 4: Tesla Economics: Capital Recovery & Early Payoff Dossier**

  * Net acquisition breakdown: Gross price (€40,000) - Grants (Plan MOVES III, IRPF 15%, CAE) = Adjusted Net Cost.

  * Cumulative gas offset progression bar (`% Done` towards 100% Free Car).

  * Monthly loan vs gas offset cashflow comparison.

  * **Early Payoff Target Engine**: Real-time lump-sum settlement balance vs interest kept in pocket (canceling future bank financing interest).



---



## 🚀 1-Click HACS Installation (Recommended)



You can now install all modular cards with **1 click via HACS**:



1. In Home Assistant, open HACS ➔ click the three dots (⋮) in the top right ➔ select **Custom repositories**.

2. Paste: `https://github.com/Aresitoo/ha-tesla-mission-control`

3. Category: **Dashboard** (or Lovelace / Plugin).

4. Click Add, find **Tesla & EV Mission Control Cards**, and click Download.



Once installed, all modular cards are available across any of your dashboards with zero dependencies:



### 1. Interactive 2D Top-Down Cockpit Card

```yaml

type: custom:tesla-cockpit-card

```



### 2. V2C Trydan Smart EVSE Charger Modulation Card

```yaml

type: custom:tesla-charger-card

```



### 3. Car Charging & Session Energy Costs Card

```yaml

type: custom:tesla-charging-costs-card

```



### 4. MITECO Fuel Price & Petrol vs EV Savings Card

```yaml

type: custom:tesla-savings-card

```



### 5. Capital Recovery & Early Payoff ROI Dossier Card

```yaml

type: custom:tesla-roi-card

```



### 6. Unified Mission Control Deck (All Cards in One)

```yaml

type: custom:tesla-mission-control-deck

```



---



## 📋 Alternative: Full YAML View Import (Raw Configuration Editor)



If you prefer to import the entire complete dashboard view as raw YAML instead of using the custom cards:



1. Install **`button-card`** via HACS (`HACS -> Frontend -> button-card`).

2. Download or copy [`tesla_mission_control.yaml`](./tesla_mission_control.yaml) from this repository.

3. In Home Assistant, navigate to your desired dashboard, click **Edit Dashboard** $\rightarrow$ **Raw Configuration Editor**.

4. Paste the view into your `views:` array and save.



---



## 📄 License



Distributed under the MIT License. See `LICENSE` for more information.

