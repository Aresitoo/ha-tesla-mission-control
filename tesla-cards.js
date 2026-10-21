/**
 * Home Assistant Tesla & EV Mission Control Cards (HACS Compatible)
 * High-performance, modular custom cards for interactive 2D top-down vehicle telemetry,
 * dynamic V2C Trydan EVSE charger modulation, session energy costs, and fuel savings ROI analytics.
 *
 * Registered Custom Elements:
 * - <tesla-cockpit-card>
 * - <tesla-charger-card>
 * - <tesla-charging-costs-card>
 * - <tesla-savings-card>
 * - <tesla-roi-card>
 * - <tesla-mission-control-deck> (All-in-one unified deck)
 */

(function() {
  'use strict';

  // Base Class for Tesla Cards
  class BaseTeslaCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
      this._config = Object.assign({}, config);
    }

    set hass(hass) {
      this._hass = hass;
      if (typeof window !== 'undefined') {
        window._haHass = hass;
      }
      this._render();
    }

    _render() {
      if (!this._hass) return;
      const states = this._hass.states;
      const hass = this._hass;
      const config = this._config;

      try {
        const html = this.renderContent(states, hass, config);
        this.shadowRoot.innerHTML = `
          <style>
            :host {
              display: block;
            }
            ha-card {
              background: ${this.cardBackground || 'linear-gradient(145deg, #0e131a 0%, #161d27 100%)'};
              border-radius: 20px;
              border: 1px solid ${this.cardBorder || 'rgba(216, 199, 168, 0.22)'};
              box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
              overflow: hidden;
              padding: 0px;
              display: block;
              pointer-events: auto !important;
            }
            ${this.extraStyles || ''}
          </style>
          <ha-card>
            ${html}
          </ha-card>
        `;
      } catch (err) {
        console.error('Error rendering Tesla card:', err);
        this.shadowRoot.innerHTML = `<ha-card style="padding: 16px; color: #ff5252;">Error rendering ${this.tagName.toLowerCase()}: ${err.message}</ha-card>`;
      }
    }
  }

  // 1. Tesla 2D Interactive Cockpit & Vehicle Controls Card
  class TeslaCockpitCard extends BaseTeslaCard {
    static getStubConfig() {
      return {
        battery_level: "sensor.tesla_battery_level",
        battery_range: "sensor.tesla_battery_range",
        charge_limit: "number.tesla_charge_limit",
        odometer: "sensor.tesla_odometer"
      };
    }
    get cardBorder() { return 'rgba(216, 199, 168, 0.22)'; }
    renderContent(states, hass, config) {
// Store live hass instance globally
              if (typeof hass !== 'undefined' && hass) {
                window._haHass = hass;
              }

              // Install global event handlers for robust touch/click interaction
              
                if (!window._openTeslaEntityMoreInfo) {
                  window._openTeslaEntityMoreInfo = function(event, entityId) {
                    if (event) {
                      if (event.stopPropagation) event.stopPropagation();
                      if (event.preventDefault) event.preventDefault();
                    }
                    const ev = new CustomEvent('hass-more-info', {
                      bubbles: true,
                      composed: true,
                      detail: { entityId: entityId }
                    });
                    const rootHa = document.querySelector('home-assistant');
                    if (rootHa && rootHa.dispatchEvent) rootHa.dispatchEvent(ev);
                    else window.dispatchEvent(ev);
                  };
                }

                if (!window._callTeslaHa) {
                window._callTeslaHa = function(domain, service, serviceData, el) {
                  if (el) {
                    el.style.transform = 'scale(0.93)';
                    el.style.opacity = '0.7';
                    setTimeout(() => {
                      el.style.transform = '';
                      el.style.opacity = '';
                    }, 140);
                  }
                  if (window._haHass && window._haHass.callService) {
                    window._haHass.callService(domain, service, serviceData).catch(e => {
                      console.warn('Tesla BLE callService error:', e);
                    });
                    return;
                  }
                  const ev = new CustomEvent('hass-service-call', {
                    bubbles: true,
                    composed: true,
                    detail: { domain: domain, service: service, serviceData: serviceData }
                  });
                  const rootHa = document.querySelector('home-assistant');
                  if (rootHa && rootHa.dispatchEvent) rootHa.dispatchEvent(ev);
                };

                // Pure Local BLE climate toggle
                window._toggleTeslaClimate = function(event, el) {
                  if (event) {
                    if (event.stopPropagation) event.stopPropagation();
                    if (event.preventDefault) event.preventDefault();
                  }
                  let isCurrentlyOn = false;
                  if (window._haHass && window._haHass.states) {
                    const sBle = window._haHass.states['switch.tesla_ble_garage_climate'];
                    if (sBle && sBle.state === 'on') isCurrentlyOn = true;
                  }
                  const targetService = isCurrentlyOn ? 'turn_off' : 'turn_on';
                  window._callTeslaHa('switch', targetService, { entity_id: 'switch.tesla_ble_garage_climate' }, el);
                };

                // Pure Local BLE temperature adjustment
                window._stepTeslaTemp = function(event, delta, el) {
                  if (event) {
                    if (event.stopPropagation) event.stopPropagation();
                    if (event.preventDefault) event.preventDefault();
                  }
                  let curTemp = 20;
                  if (window._haHass && window._haHass.states) {
                    const numBle = window._haHass.states['number.tesla_ble_garage_climate_temperature'];
                    if (numBle && !isNaN(parseFloat(numBle.state))) curTemp = parseFloat(numBle.state);
                  }
                  const newTemp = Math.max(16, Math.min(28, Math.round(curTemp + delta)));
                  window._callTeslaHa('number', 'set_value', { entity_id: 'number.tesla_ble_garage_climate_temperature', value: newTemp }, el);
                };

                // Precision Handle-Only Dragging (Tesla App Style)
                window._startTeslaHandleDrag = function(e, handleEl) {
                  if (!handleEl) return;
                  if (e.stopPropagation) e.stopPropagation();
                  try { handleEl.setPointerCapture(e.pointerId); } catch(err) {}

                  const trackEl = handleEl.parentElement;
                  if (!trackEl) return;

                  const onMove = function(moveEv) {
                    const rect = trackEl.getBoundingClientRect();
                    let pct = Math.round(((moveEv.clientX - rect.left) / rect.width) * 100);
                    pct = Math.max(50, Math.min(100, pct));
                    handleEl.style.left = pct + '%';
                    const badge = handleEl.querySelector('#tesla-bar-badge');
                    if (badge) badge.innerText = pct + '% LIMIT';
                    const headerTarget = document.querySelector('#tesla-target-display');
                    if (headerTarget) headerTarget.innerText = 'Target: ' + pct + '%';
                    const flowBar = trackEl.querySelector('#tesla-charging-flow-bar');
                    if (flowBar) {
                      const barSoc = parseFloat(flowBar.dataset.soc || 0);
                      flowBar.style.width = Math.max(0, pct - barSoc) + '%';
                    }
                    if (moveEv.stopPropagation) moveEv.stopPropagation();
                  };

                  const onUp = function(upEv) {
                    handleEl.removeEventListener('pointermove', onMove);
                    handleEl.removeEventListener('pointerup', onUp);
                    handleEl.removeEventListener('pointercancel', onUp);
                    try { handleEl.releasePointerCapture(upEv.pointerId); } catch(err) {}

                    const rect = trackEl.getBoundingClientRect();
                    let pct = Math.round(((upEv.clientX - rect.left) / rect.width) * 100);
                    pct = Math.max(50, Math.min(100, pct));

                    if (window._callTeslaHa) {
                      window._callTeslaHa('number', 'set_value', {
                        entity_id: 'number.tesla_ble_garage_charging_limit',
                        value: pct
                      });
                    }
                    if (upEv.stopPropagation) upEv.stopPropagation();
                  };

                  handleEl.addEventListener('pointermove', onMove);
                  handleEl.addEventListener('pointerup', onUp);
                  handleEl.addEventListener('pointercancel', onUp);
                };

                // Optimistic Closure Toggler (Trunk & Frunk)
                window._toggleTeslaClosure = function(event, closureType, el) {
                  if (event) {
                    if (event.stopPropagation) event.stopPropagation();
                    if (event.preventDefault) event.preventDefault();
                  }
                  if (!window._optimisticClosures) window._optimisticClosures = {};

                  let entityId = 'cover.tesla_ble_garage_boot';
                  let isCurrentlyOpen = false;

                  if (closureType === 'trunk') {
                    entityId = 'cover.tesla_ble_garage_boot';
                    const s = window._haHass?.states[entityId]?.state;
                    isCurrentlyOpen = (s === 'open' || s === 'opening');
                    if (window._optimisticClosures['trunk']) {
                      isCurrentlyOpen = window._optimisticClosures['trunk'].isOpen;
                    }
                  } else if (closureType === 'frunk') {
                    entityId = 'cover.tesla_ble_garage_frunk';
                    const s = window._haHass?.states[entityId]?.state;
                    isCurrentlyOpen = (s === 'open' || s === 'opening');
                    if (window._optimisticClosures['frunk']) {
                      isCurrentlyOpen = window._optimisticClosures['frunk'].isOpen;
                    }
                  }

                  const nextStateIsOpen = !isCurrentlyOpen;
                  window._optimisticClosures[closureType] = {
                    isOpen: nextStateIsOpen,
                    expires: Date.now() + 45000
                  };

                  if (el) {
                    el.style.transform = 'scale(0.92)';
                    setTimeout(() => { el.style.transform = ''; }, 140);
                    const label = el.querySelector('span');
                    const name = closureType === 'trunk' ? 'Trunk' : 'Frunk';
                    if (label) label.innerText = nextStateIsOpen ? `${name} Open` : `${name} Closed`;
                    el.style.background = nextStateIsOpen ? 'rgba(255, 82, 82, 0.18)' : 'rgba(0, 230, 118, 0.12)';
                    el.style.borderColor = nextStateIsOpen ? 'rgba(255, 82, 82, 0.45)' : 'rgba(0, 230, 118, 0.35)';
                    el.style.color = nextStateIsOpen ? '#ff5252' : '#00e676';
                    const icon = el.querySelector('ha-icon');
                    if (icon) icon.style.color = nextStateIsOpen ? '#ff5252' : '#00e676';
                  }

                  const action = nextStateIsOpen ? 'open_cover' : 'close_cover';
                  window._callTeslaHa('cover', action, { entity_id: entityId }, el);
                };
              }

              
                // V2C Charger Non-Blocking Inline Confirmation Handlers (Pure DOM)
                window._lastV2cTap = 0;
                window._toggleV2cFromImage = function(event, el) {
                  if (event) {
                    if (event.stopPropagation) event.stopPropagation();
                    if (event.preventDefault) event.preventDefault();
                  }
                  const now = Date.now();
                  if (now - (window._lastV2cTap || 0) < 400) return;
                  window._lastV2cTap = now;

                  const parent = el ? (el.parentElement || el.closest('#container')) : document;
                  const pill = parent ? parent.querySelector('#v2c-confirm-pill') : document.querySelector('#v2c-confirm-pill');
                  if (pill) {
                    pill.style.display = 'flex';
                    clearTimeout(window._v2cPromptTimer);
                    window._v2cPromptTimer = setTimeout(() => { pill.style.display = 'none'; }, 6000);
                  }
                };

                window._confirmV2cAction = function(event, el) {
                  if (event) {
                    if (event.stopPropagation) event.stopPropagation();
                    if (event.preventDefault) event.preventDefault();
                  }
                  const parent = el ? (el.closest('#v2c-confirm-pill') || document) : document;
                  const pill = parent ? (parent.id === 'v2c-confirm-pill' ? parent : parent.querySelector('#v2c-confirm-pill')) : null;
                  if (pill) pill.style.display = 'none';
                  clearTimeout(window._v2cPromptTimer);

                  const chargerSwitch = window._haHass?.states['switch.tesla_ble_garage_charger']?.state || '';
                  const sBleState = window._haHass?.states['sensor.tesla_ble_garage_charging_state']?.state || '';
                  const isCurrentlyCharging = (chargerSwitch === 'on') || (sBleState.toLowerCase() === 'charging');

                  const targetAction = isCurrentlyCharging ? 'turn_off' : 'turn_on';
                  window._callTeslaHa('switch', targetAction, { entity_id: 'switch.tesla_ble_garage_charger' }, el);
                };

                window._cancelV2cAction = function(event, el) {
                  if (event) {
                    if (event.stopPropagation) event.stopPropagation();
                    if (event.preventDefault) event.preventDefault();
                  }
                  const parent = el ? (el.closest('#v2c-confirm-pill') || document) : document;
                  const pill = parent ? (parent.id === 'v2c-confirm-pill' ? parent : parent.querySelector('#v2c-confirm-pill')) : null;
                  if (pill) pill.style.display = 'none';
                  clearTimeout(window._v2cPromptTimer);
                };

              const bleStatus = states['binary_sensor.tesla_ble_garage_ble_status']?.state === 'on';
              const isAsleep = states['binary_sensor.tesla_ble_garage_asleep']?.state === 'on';
              const lockState = states['lock.tesla_ble_garage_lock_car']?.state || 'locked';
              const sentryState = states['switch.tesla_ble_garage_sentry_mode']?.state === 'on';

              let frunkClosed = (states['cover.tesla_ble_garage_frunk']?.state === 'closed') && (states['binary_sensor.tesla_ble_garage_frunk']?.state !== 'on');
              if (window._optimisticClosures && window._optimisticClosures['frunk'] && Date.now() < window._optimisticClosures['frunk'].expires) {
                frunkClosed = !window._optimisticClosures['frunk'].isOpen;
              }

              let trunkClosed = (states['cover.tesla_ble_garage_boot']?.state === 'closed') && (states['binary_sensor.tesla_ble_garage_boot']?.state !== 'on');
              if (window._optimisticClosures && window._optimisticClosures['trunk'] && Date.now() < window._optimisticClosures['trunk'].expires) {
                trunkClosed = !window._optimisticClosures['trunk'].isOpen;
              }

              const chargePortDoorOpen = states['binary_sensor.tesla_ble_garage_charge_flap']?.state === 'on';

              // Battery & Range
              const soc = parseFloat(states['sensor.tesla_ble_garage_charge_level']?.state) || 82;
              const rangeNowKm = Math.round(parseFloat(states['sensor.tesla_ble_garage_range']?.state) || 367);
              const limitPct = parseFloat(states['number.tesla_ble_garage_charging_limit']?.state) || 50;
              const odoKm = Math.round(parseFloat(states['sensor.tesla_ble_garage_odometer']?.state) || 14963).toLocaleString('de-DE');
              const energyAdded = (parseFloat(states['sensor.tesla_ble_garage_charge_energy_added']?.state) || 27.3).toFixed(1);
              const distAdded = Math.round(parseFloat(states['sensor.tesla_ble_garage_charge_distance_added']?.state) || 203);

              // Charging Telemetry & State
              const minsToLimitRaw = parseFloat(states['sensor.tesla_ble_garage_minutes_to_limit']?.state);
              const evseCharging = states['binary_sensor.evse_192_168_0_249_charging']?.state === 'on';
              const evsePower = parseFloat(states['sensor.evse_192_168_0_249_charge_power']?.state) || 0;
              const evseConnected = states['binary_sensor.evse_192_168_0_249_connected']?.state === 'on';
              const isPaused = states['switch.evse_192_168_0_249_pause_session']?.state === 'on';
              const teslaChargingState = states['sensor.tesla_ble_garage_charging_state']?.state || 'Disconnected';
              const isCharging = evseCharging || teslaChargingState.toLowerCase() === 'charging' || evsePower > 100;
              const isPluggedIn = evseConnected || isCharging || chargePortDoorOpen;

              let timeLeftText = '';
              if (!isNaN(minsToLimitRaw) && minsToLimitRaw > 0) {
                const h = Math.floor(minsToLimitRaw / 60);
                const m = Math.round(minsToLimitRaw % 60);
                timeLeftText = `${h > 0 ? h + 'h ' : ''}${m}m left to ${limitPct}% limit`;
              } else if (isCharging && evsePower > 200) {
                const neededKwh = Math.max(0, (limitPct - soc) / 100 * 60);
                const hours = neededKwh / (evsePower / 1000);
                const totalM = Math.round(hours * 60);
                if (totalM > 0) {
                  const h = Math.floor(totalM / 60);
                  const m = totalM % 60;
                  timeLeftText = `${h > 0 ? h + 'h ' : ''}${m}m left to ${limitPct}%`;
                } else {
                  timeLeftText = 'At target limit';
                }
              }

              // 4 Tires (Dynamic color: Red if below 2.8 bar, White if optimal >= 2.8 bar)
              const fl_val = parseFloat(states['sensor.tesla_ble_garage_tyre_pressure_front_left']?.state) || 3.05;
              const fr_val = parseFloat(states['sensor.tesla_ble_garage_tyre_pressure_front_right']?.state) || 3.15;
              const rl_val = parseFloat(states['sensor.tesla_ble_garage_tyre_pressure_rear_left']?.state) || 2.98;
              const rr_val = parseFloat(states['sensor.tesla_ble_garage_tyre_pressure_rear_right']?.state) || 3.15;

              const fl_col = fl_val < 2.8 ? '#ff5252' : '#ffffff';
              const fr_col = fr_val < 2.8 ? '#ff5252' : '#ffffff';
              const rl_col = rl_val < 2.8 ? '#ff5252' : '#ffffff';
              const rr_col = rr_val < 2.8 ? '#ff5252' : '#ffffff';

              const fl = fl_val.toFixed(2).replace('.', ',');
              const fr = fr_val.toFixed(2).replace('.', ',');
              const rl = rl_val.toFixed(2).replace('.', ',');
              const rr = rr_val.toFixed(2).replace('.', ',');

              // Climate (Pure Local BLE)
              const inTemp = (parseFloat(states['sensor.tesla_ble_garage_interior']?.state) || 21.6).toFixed(1);
              const outTemp = (parseFloat(states['sensor.tesla_ble_garage_exterior']?.state) || 21.5).toFixed(1);
              const targetTemp = Math.round(parseFloat(states['number.tesla_ble_garage_climate_temperature']?.state) || 20);
              const climateOn = states['switch.tesla_ble_garage_climate']?.state === 'on';

              // Battery Color: Signature Cyan-to-Amber (NO GREEN)
              let battColor = (soc < 20) ? '#ff5252' : '#ffb74d';

              
              // Tesla OTA Software Update
              const updateEnt = states['update.mr_white_update'];
              const updateAvailable = updateEnt && updateEnt.state === 'on';
              const updateInProgress = updateEnt && updateEnt.attributes && updateEnt.attributes.in_progress;
              const latestVer = updateEnt?.attributes?.latest_version || '';
              const currentVer = updateEnt?.attributes?.installed_version || '';
              const updatePct = updateEnt?.attributes?.update_percentage;

              // Transparent V2C Trydan PNG
              const v2cImg = '/api/image/serve/497e08e83b214671f3c1805f0df0f6b5/original';

              return `
                <div style="position: relative; pointer-events: auto !important; padding: 16px 14px 14px; box-sizing: border-box; width: 100%;">
                  
                  <!-- Top Vehicle Dossier Header -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.25); display: flex; align-items: center; justify-content: center;">
                        <ha-icon icon="mdi:car-sports" style="color: #00e5ff; --mdc-icon-size: 22px;"></ha-icon>
                      </div>
                      <div>
                        <div style="font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.3px;">Mr. White</div>
                        <div style="font-size: 10.5px; color: rgba(255, 255, 255, 0.55); font-weight: 500;">Model 3 Highland • ${odoKm} km</div>
                      </div>

</div>

                    <!-- Connection, Sleep & OTA Pill Badges -->
                    <div style="display: flex; gap: 5px; align-items: center;">
                      ${updateAvailable ? `
                      <div id="tesla-ota-header-pill" style="display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; background: rgba(255, 179, 0, 0.16); border: 1px solid rgba(255, 179, 0, 0.55); font-size: 9.5px; font-weight: 700; color: #ffd54f; box-shadow: 0 0 10px rgba(255, 179, 0, 0.22); cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;"
                           onclick="window._openTeslaEntityMoreInfo(event, 'update.mr_white_update')"
                           onpointerup="window._openTeslaEntityMoreInfo(event, 'update.mr_white_update')">
                        <ha-icon icon="mdi:arrow-up-bold" style="color: #ffb74d; --mdc-icon-size: 11px;"></ha-icon>
                        <span>OTA ${latestVer}</span>
                      </div>
                      ` : ''}
                      <div style="display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; background: ${bleStatus ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${bleStatus ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 255, 255, 0.1)'}; font-size: 9.5px; font-weight: 700; color: ${bleStatus ? '#00e676' : 'rgba(255, 255, 255, 0.5)'};">
                        <span style="width: 5px; height: 5px; border-radius: 50%; background: ${bleStatus ? '#00e676' : '#78909c'};"></span>
                        ${bleStatus ? 'BLE Active' : 'BLE Standby'}
                      </div>
                      <div style="display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; background: ${isAsleep ? 'rgba(120, 144, 156, 0.15)' : 'rgba(0, 229, 255, 0.12)'}; border: 1px solid ${isAsleep ? 'rgba(120, 144, 156, 0.3)' : 'rgba(0, 229, 255, 0.35)'}; font-size: 9.5px; font-weight: 700; color: ${isAsleep ? '#90a4ae' : '#00e5ff'};">
                        <span>${isAsleep ? '💤 Asleep' : '⚡ Awake'}</span>
                      </div>
                    </div>
                  </div>


                  <!-- Battery & Range Telemetry Hub -->
                  <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                      <div>
                        <div style="font-size: 9.5px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.5px;">Battery Level</div>
                        <div style="font-size: 26px; font-weight: 900; color: ${battColor}; line-height: 1.1;">
                          ${soc}%
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 9.5px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.5px;">Current Range (Now)</div>
                        <div style="font-size: 26px; font-weight: 900; color: #00e5ff; line-height: 1.1;">
                          ${rangeNowKm} <span style="font-size: 14px; font-weight: 700; color: #64b5f6;">km</span>
                        </div>
                        <div style="font-size: 9px; color: rgba(255, 255, 255, 0.45); font-weight: 600;">• Rated Estimate</div>
                      </div>
                    </div>

                    <!-- Single Interactive Draggable Battery Bar (Tesla App Style) -->
                    <div style="position: relative; width: 100%; margin: 26px 0 16px; padding: 0; box-sizing: border-box; touch-action: pan-y;">
                      
                      <!-- Visual Bar Track -->
                      <div id="tesla-bar-track" style="position: relative; width: 100%; height: 16px; background: rgba(255, 255, 255, 0.08); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box; overflow: visible;">
                        
                        <!-- Inner Clipped Fill Track (Zero black gap, perfect 7px rounded ends) -->
                        <div style="position: absolute; inset: 0; border-radius: 7px; overflow: hidden; pointer-events: none;">
                          <!-- Solid SoC Fill (0 to soc%) -->
                          <div id="tesla-soc-bar" style="position: absolute; left: 0; top: 0; width: ${soc}%; height: 100%; background: linear-gradient(90deg, #00b0ff 0%, #ffb74d 100%); transition: width 0.3s ease; z-index: 2;"></div>

                          <!-- Continuous Liquid Flow to Limit (soc% to limitPct%, perfectly seamless) -->
                          ${(isCharging && limitPct > soc) ? `
                          <div id="tesla-charging-flow-bar"
                               data-soc="${soc}"
                               style="position: absolute; left: ${soc}%; width: ${Math.max(0, limitPct - soc)}%; height: 100%; top: 0; background: linear-gradient(90deg, rgba(255, 183, 77, 0.32) 0%, rgba(0, 229, 255, 0.32) 100%); z-index: 1; overflow: hidden;">
                            <!-- Hardware-accelerated GPU liquid wave matching left bar palette -->
                            <div class="tesla-liquid-wave" style="position: absolute; top: 0; left: 0; width: 200%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255, 183, 77, 0.55) 25%, rgba(255, 255, 255, 0.95) 50%, rgba(0, 229, 255, 0.55) 75%, transparent 100%); animation: teslaLiquidWaveFlow 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite; -webkit-animation: teslaLiquidWaveFlow 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite; pointer-events: none;"></div>
                          </div>
                          ` : ''}
                        </div>

                        <!-- Interactive Handle: 48px wide hit target centered on the vertical line -->
                        <div id="tesla-bar-handle"
                             onpointerdown="window._startTeslaHandleDrag && window._startTeslaHandleDrag(event, this);"
                             style="position: absolute; left: ${limitPct}%; top: -16px; bottom: -16px; width: 48px; margin-left: -24px; cursor: ew-resize; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; touch-action: none; -webkit-tap-highlight-color: transparent; user-select: none;">
                          <!-- Target Limit Pill Badge Above Handle -->
                          <div id="tesla-bar-badge" style="position: absolute; bottom: calc(100% - 9px); background: #00e5ff; color: #080c12; font-size: 9.5px; font-weight: 900; padding: 2px 7px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,229,255,0.8); white-space: nowrap; letter-spacing: 0.4px; pointer-events: none;">
                            ${Math.round(limitPct)}% LIMIT
                          </div>
                          <!-- Triangular Arrow Pointer Pointing Down -->
                          <div style="position: absolute; bottom: calc(100% - 14px); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #00e5ff; pointer-events: none;"></div>
                          <!-- The actual vertical line indicator with cyan glow -->
                          <div style="width: 4px; height: 34px; background: #ffffff; border-radius: 2px; box-shadow: 0 0 14px #00e5ff, 0 0 4px #ffffff, 0 2px 6px rgba(0,0,0,0.9); pointer-events: none;"></div>
                        </div>
                      </div>
                    </div>

                    <!-- Charging Status Banner -->
                    ${isCharging ? `
                    <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; background: rgba(0, 229, 255, 0.08); border-radius: 8px; padding: 5px 10px; border: 1px solid rgba(0, 229, 255, 0.32);">
                      <div style="display: flex; align-items: center; gap: 5px; color: #00e5ff;">
                        <ha-icon icon="mdi:lightning-bolt" style="--mdc-icon-size: 14px; color: #00e5ff;"></ha-icon>
                        <span>Charging at ${(evsePower/1000).toFixed(1)} kW</span>
                      </div>
                      <div style="color: #00e5ff; font-size: 9.5px; font-weight: 800;">
                        ${timeLeftText || `Target: ${limitPct}%`}
                      </div>
                    </div>
                    ` : ''}

                    <!-- Session Energy & Distance HUD -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 10px; color: rgba(255, 255, 255, 0.7); font-weight: 600;">
                      <div style="display: flex; align-items: center; gap: 4px;">
                        <span>⚡</span> Energy Added: <b style="color: #00e5ff;">+${energyAdded} kWh</b>
                      </div>
                      <div style="display: flex; align-items: center; gap: 4px;">
                        <span>🚗</span> Range Added: <b style="color: #ffd54f;">+${distAdded} km</b>
                      </div>
                      <div style="display: flex; align-items: center; gap: 4px;">
                        <span>📍</span> Garage Parked
                      </div>
                    </div>
                  </div>

                  <!-- 2D Highland Top-Down Vehicle Cockpit & Sensors Canvas -->
                  <div style="position: relative; width: 100%; max-width: 380px; margin: 0 auto 14px; height: 380px; background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.5) 75%); border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.06); overflow: hidden; contain: paint;">
                    
                    <!-- Top Closure Controls Bar -->
                    <div style="position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: center; z-index: 7;">
                      <!-- Lock Badge -->
                      <div onclick="window._callTeslaHa('lock', '${lockState === 'locked' ? 'unlock' : 'lock'}', {entity_id: 'lock.tesla_ble_garage_lock_car'}, this);" style="cursor: pointer; background: ${lockState === 'locked' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 82, 82, 0.15)'}; border: 1px solid ${lockState === 'locked' ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 82, 82, 0.4)'}; padding: 3px 8px; border-radius: 12px; font-size: 9.5px; font-weight: 700; color: ${lockState === 'locked' ? '#00e676' : '#ff5252'}; display: flex; align-items: center; gap: 4px;">
                        <ha-icon icon="${lockState === 'locked' ? 'mdi:lock' : 'mdi:lock-open-variant'}" style="--mdc-icon-size: 13px; color: ${lockState === 'locked' ? '#00e676' : '#ff5252'};"></ha-icon>
                        <span>${lockState === 'locked' ? 'LOCKED' : 'UNLOCKED'}</span>
                      </div>

                      <!-- Frunk Closed/Open Pill -->
                      <div onclick="window._toggleTeslaClosure(event, 'frunk', this);" style="cursor: pointer; background: ${frunkClosed ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 82, 82, 0.15)'}; border: 1px solid ${frunkClosed ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 82, 82, 0.4)'}; padding: 3px 8px; border-radius: 12px; font-size: 9.5px; font-weight: 700; color: ${frunkClosed ? '#00e676' : '#ff5252'}; display: flex; align-items: center; gap: 4px; transition: all 0.15s ease;">
                        <ha-icon icon="mdi:car" style="--mdc-icon-size: 13px; color: ${frunkClosed ? '#00e676' : '#ff5252'};"></ha-icon>
                        <span>${frunkClosed ? 'Frunk Closed' : 'Frunk Open'}</span>
                      </div>

                      <!-- Sentry Mode Badge -->
                      <div onclick="window._callTeslaHa('switch', 'toggle', {entity_id: 'switch.tesla_ble_garage_sentry_mode'}, this);" style="cursor: pointer; background: ${sentryState ? 'rgba(244, 67, 54, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${sentryState ? 'rgba(244, 67, 54, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; padding: 3px 8px; border-radius: 12px; font-size: 9.5px; font-weight: 700; color: ${sentryState ? '#ef5350' : 'rgba(255, 255, 255, 0.6)'}; display: flex; align-items: center; gap: 4px;">
                        <ha-icon icon="mdi:cctv" style="--mdc-icon-size: 13px; color: ${sentryState ? '#ef5350' : 'rgba(255, 255, 255, 0.6)'};"></ha-icon>
                        <span>${sentryState ? 'Sentry ON' : 'Sentry OFF'}</span>
                      </div>
                    </div>

                    <!-- Car render moved into unified SVG below -->

                    <!-- 4 Precise Tire Pressures (Snug Outside Wheel Arches, Red Alert if < 2.8 bar) -->
                    <!-- FRONT LEFT TIRE (top: 92px) -->
                    <div style="position: absolute; top: 92px; right: calc(50% + 70px); text-align: right; pointer-events: none;">
                      <div style="font-size: 13.5px; font-weight: 700; color: ${fl_col}; letter-spacing: 0.2px; text-shadow: 0 1px 4px rgba(0,0,0,0.9);">${fl}</div>
                    </div>

                    <!-- FRONT RIGHT TIRE (top: 92px) -->
                    <div style="position: absolute; top: 92px; left: calc(50% + 70px); text-align: left; pointer-events: none;">
                      <div style="font-size: 13.5px; font-weight: 700; color: ${fr_col}; letter-spacing: 0.2px; text-shadow: 0 1px 4px rgba(0,0,0,0.9);">${fr}</div>
                    </div>

                    <!-- REAR LEFT TIRE (top: 260px) -->
                    <div style="position: absolute; top: 260px; right: calc(50% + 70px); text-align: right; pointer-events: none;">
                      <div style="font-size: 13.5px; font-weight: 700; color: ${rl_col}; letter-spacing: 0.2px; text-shadow: 0 1px 4px rgba(0,0,0,0.9);">${rl}</div>
                    </div>

                    <!-- REAR RIGHT TIRE (top: 260px) -->
                    <div style="position: absolute; top: 260px; left: calc(50% + 70px); text-align: left; pointer-events: none;">
                      <div style="font-size: 13.5px; font-weight: 700; color: ${rr_col}; letter-spacing: 0.2px; text-shadow: 0 1px 4px rgba(0,0,0,0.9);">${rr}</div>
                    </div>

                    <!-- BOTTOM CENTER PILL: TRUNK -->
                    <div style="position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); z-index: 7;">
                      <div onclick="window._toggleTeslaClosure(event, 'trunk', this);" style="cursor: pointer; background: ${trunkClosed ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 82, 82, 0.15)'}; border: 1px solid ${trunkClosed ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 82, 82, 0.4)'}; padding: 3px 8px; border-radius: 12px; font-size: 9.5px; font-weight: 700; color: ${trunkClosed ? '#00e676' : '#ff5252'}; display: flex; align-items: center; gap: 4px; transition: all 0.15s ease;">
                        <ha-icon icon="mdi:car" style="--mdc-icon-size: 13px; color: ${trunkClosed ? '#00e676' : '#ff5252'};"></ha-icon>
                        <span>${trunkClosed ? 'Trunk Closed' : 'Trunk Open'}</span>
                      </div>
                    </div>

                                                                                                                        <!-- Unified Highland 2D Top-Down Render & Dynamic Cable SVG (Locked 1:1 Vector Space) -->
                    <svg viewBox="0 0 380 380" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;">
                      <defs>
                        <filter id="v2cCableGlow" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <filter id="carTopDropShadow" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#000000" flood-opacity="0.85" />
                        </filter>
                        <style>
                          @keyframes v2cWaveSlide {
                            0% { stroke-dashoffset: 24; }
                            100% { stroke-dashoffset: 0; }
                          }
                          @-webkit-keyframes v2cWaveSlide {
                            0% { stroke-dashoffset: 24; }
                            100% { stroke-dashoffset: 0; }
                          }
                          .v2c-cable-pulse {
                            animation: v2cWaveSlide 1.2s linear infinite;
                            -webkit-animation: v2cWaveSlide 1.2s linear infinite;
                          }
                        </style>
                      </defs>

                      <!-- Clean Highland 2D Top-Down Render (Locked at exact SVG coordinates 59.33, 15) -->
                      <image href="/api/image/serve/6463e9cfbb736ea62045a1c15ab29897/original"
                             xlink:href="/api/image/serve/6463e9cfbb736ea62045a1c15ab29897/original"
                             x="59.33" y="15" width="261.33" height="350"
                             preserveAspectRatio="contain"
                             filter="url(#carTopDropShadow)" />

                      ${isPluggedIn ? `
                      <!-- Base Outer Cable Shell -->
                      <path d="M 62 350 C 82 368, 104 338, 126 308"
                            fill="none" stroke="#161c22" stroke-width="5" stroke-linecap="round" />

                      <!-- Inner Cable Core -->
                      <path d="M 62 350 C 82 368, 104 338, 126 308"
                            fill="none" stroke="${isCharging ? '#203a32' : '#263238'}" stroke-width="3" stroke-linecap="round" />

                      <!-- Active Charging Pulse Waves -->
                      ${isCharging ? `
                      <path class="v2c-cable-pulse"
                            d="M 62 350 C 82 368, 104 338, 126 308"
                            fill="none" stroke="#00e676" stroke-width="2.5" stroke-linecap="round"
                            stroke-dasharray="10 14" filter="url(#v2cCableGlow)" />
                      ` : ''}

                      <!-- Plug Connector Handle inserted into port at exact blue dot (134, 301) rotated -42 deg -->
                      <g transform="translate(134, 301) rotate(-42)">
                        <!-- Recessed socket housing in black taillight base -->
                        <ellipse cx="0" cy="0" rx="2.5" ry="3.8" fill="#05070a" stroke="#1c252d" stroke-width="0.8" />

                        <!-- Plug connector handle inserted into port -->
                        <rect x="-8.5" y="-3" width="8.5" height="6" rx="1.5" fill="#161c22" stroke="#37474f" stroke-width="0.8" />
                        <!-- Strain relief collar meeting cable at 126, 308 -->
                        <path d="M -8.5 -2.2 L -11.5 -1.5 L -11.5 1.5 L -8.5 2.2 Z" fill="#0f1418" stroke="#263238" stroke-width="0.6" />
                        <!-- Glowing charging indicator LED on handle -->
                        <circle cx="-4" cy="0" r="1.5" fill="${isCharging ? '#00e676' : '#78909c'}" ${isCharging ? 'filter="url(#v2cCableGlow)"' : ''} />
                        <circle cx="-4" cy="0" r="0.8" fill="${isCharging ? '#ffffff' : '#cfd8dc'}" />
                      </g>

                      <!-- Highland Charge Port Flap: JOINT DIRECTLY TO CAR BODY SEAM (NO GAP) -->
                      <g id="chargePortFlap">
                        <!-- Highland Charge Port Flap: soft-edged triangle aligned with car taillight top triangle -->
                        <path d="M 128.0 299.5 Q 129.8 295.0, 134.2 292.0 Q 135.0 296.5, 135.5 301.5 Z"
                              fill="#12161c" stroke="#2e3842" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round" />
                        
                        <!-- Door thickness / bevel along right hinge edge -->
                        <path d="M 134.2 292.0 Q 135.0 296.5, 135.5 301.5 L 134.2 300.8 Q 133.8 296.0, 133.3 293.0 Z"
                              fill="#0a0d12" opacity="0.65" />

                        <!-- Red reflector facet: matching soft-pointed triangle aligned inside door -->
                        <path d="M 129.0 298.5 Q 130.5 295.5, 133.6 293.3 L 134.3 299.5 L 130.0 299.0 Z"
                              fill="#54141c" stroke="#7a1a25" stroke-width="0.5" stroke-linejoin="round" />

                        <!-- Subtle inner red highlight facet -->
                        <path d="M 129.6 298.0 Q 131.0 296.0, 133.3 294.5 L 133.8 298.8 Z"
                              fill="#7a1b26" opacity="0.75" />

                        <!-- Hinge seam locking flap to car body seam up to taillight top apex -->
                        <line x1="135.5" y1="301.5" x2="134.2" y2="292.0" stroke="#0a0d12" stroke-width="1.2" stroke-linecap="round" />
                      </g>` : ''}
                    </svg>

                    <!-- CHARGER UNIT IN BOTTOM-LEFT CORNER (Tap to Toggle Charging) -->
                    <div class="v2c-charger-btn"
                         onclick="window._toggleV2cFromImage(event, this);"
                         onpointerup="window._toggleV2cFromImage(event, this);"
                         title="${(isCharging && !isPaused) ? 'Tap to STOP charging' : 'Tap to START charging'}"
                         style="position: absolute; bottom: 8px; left: 8px; z-index: 10; pointer-events: auto !important; cursor: pointer !important; touch-action: manipulation; transition: transform 0.15s ease;">
                      <img src="${v2cImg}" style="height: 78px; width: auto; object-fit: contain; pointer-events: none; filter: drop-shadow(0 4px 14px rgba(0,0,0,0.85)) drop-shadow(0 0 12px ${isCharging ? 'rgba(0,230,118,0.6)' : (isPluggedIn ? 'rgba(120,144,156,0.3)' : 'rgba(0,229,255,0.15)')});" />
                    </div>

                    <!-- Non-blocking inline confirmation pill -->
                    <div id="v2c-confirm-pill"
                         style="display: none; position: absolute; bottom: 20px; left: 86px; z-index: 30; background: rgba(14, 20, 27, 0.96); border: 1.5px solid ${(isCharging && !isPaused) ? '#ff5252' : '#00e676'}; border-radius: 12px; padding: 6px 10px; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.9), 0 0 14px ${(isCharging && !isPaused) ? 'rgba(255,82,82,0.45)' : 'rgba(0,230,118,0.45)'}; pointer-events: auto !important; touch-action: manipulation;">
                      <span style="font-size: 11px; font-weight: 800; color: #ffffff; white-space: nowrap;">
                        ${(isCharging && !isPaused) ? 'STOP charging?' : 'START charging?'}
                      </span>
                      <button onclick="window._confirmV2cAction(event, this);"
                              onpointerup="window._confirmV2cAction(event, this);"
                              style="background: ${(isCharging && !isPaused) ? '#ff5252' : '#00e676'}; color: #000; border: none; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: 800; cursor: pointer; touch-action: manipulation; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                        CONFIRM
                      </button>
                      <button onclick="window._cancelV2cAction(event, this);"
                              onpointerup="window._cancelV2cAction(event, this);"
                              style="background: rgba(255,255,255,0.12); color: #cfd8dc; border: none; border-radius: 6px; padding: 4px 7px; font-size: 10px; font-weight: 700; cursor: pointer; touch-action: manipulation;">
                        &#10005;
                      </button>
                    </div>
                    </div></div></div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 12px;">
                      <!-- Climate Power Toggle Button -->
                      <div class="climate-pwr-btn"
                           style="cursor: pointer; display: flex; align-items: center; gap: 8px; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none;"
                           onclick="window._toggleTeslaClimate(event, this);"
                           onpointerup="window._toggleTeslaClimate(event, this);">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background: ${climateOn ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${climateOn ? '#00e5ff' : 'rgba(255, 255, 255, 0.1)'}; display: flex; align-items: center; justify-content: center; transition: all 0.12s ease; ${climateOn ? 'box-shadow: 0 0 10px rgba(0, 229, 255, 0.35);' : ''}">
                          ${climateOn ? `
                            <div class="fan-spinning" style="display: inline-flex; align-items: center; justify-content: center; transform-origin: 50% 50%;">
                              <ha-icon icon="mdi:fan" style="color: #00e5ff; --mdc-icon-size: 20px;"></ha-icon>
                            </div>
                          ` : `
                            <ha-icon icon="mdi:power" style="color: rgba(255, 255, 255, 0.4); --mdc-icon-size: 18px;"></ha-icon>
                          `}
                        </div>
                        <div>
                          <div style="font-size: 11px; font-weight: 800; color: ${climateOn ? '#00e5ff' : '#ffffff'};">Climate ${climateOn ? 'Active (ON)' : 'Off'}</div>
                          <div style="font-size: 9px; color: rgba(255,255,255,0.5);">Tap to toggle A/C</div>
                        </div>
                      </div>

                      <!-- Direct Temperature Stepper -->
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="temp-step-btn"
                                onclick="window._stepTeslaTemp(event, -1, this);"
                                onpointerup="window._stepTeslaTemp(event, -1, this);"
                                style="width: 28px; height: 28px; border-radius: 6px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #ffffff; font-weight: 900; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; touch-action: manipulation;">-</button>
                        <div style="text-align: center; min-width: 44px;">
                          <span style="font-size: 13.5px; font-weight: 800; color: #ffffff;">${targetTemp}°C</span>
                          <div style="font-size: 8px; color: rgba(255, 255, 255, 0.45); font-weight: 600;">TARGET</div>
                        </div>
                        <button class="temp-step-btn"
                                onclick="window._stepTeslaTemp(event, 1, this);"
                                onpointerup="window._stepTeslaTemp(event, 1, this);"
                                style="width: 28px; height: 28px; border-radius: 6px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #ffffff; font-weight: 900; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; touch-action: manipulation;">+</button>
                      </div>
                    </div>
                  </div>

                </div>

                <style>
                  @keyframes teslaLiquidWaveFlow {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0%); }
                  }
                  @-webkit-keyframes teslaLiquidWaveFlow {
                    0% { -webkit-transform: translateX(-50%); }
                    100% { -webkit-transform: translateX(0%); }
                  }
                  .tesla-liquid-wave {
                    animation: teslaLiquidWaveFlow 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
                    -webkit-animation: teslaLiquidWaveFlow 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
                    will-change: transform;
                  }
                  @keyframes energyFlowAnim {
                    0% { stroke-dashoffset: 28; }
                    100% { stroke-dashoffset: 0; }
                  }
                  @keyframes portTipPulse {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.4); opacity: 0.2; }
                  }
                  .climate-pwr-btn:active {
                    transform: scale(0.93);
                  }
                  .temp-step-btn:active {
                    transform: scale(0.90);
                    background: rgba(0, 229, 255, 0.3) !important;
                  }
                </style>
              `;
    }
  }
  customElements.define('tesla-cockpit-card', TeslaCockpitCard);

  // 2. V2C Trydan Smart Dynamic EVSE Charger Card
  class TeslaChargerCard extends BaseTeslaCard {
    static getStubConfig() {
      return {
        charging_power: "sensor.v2c_trydan_charging_power",
        intensity: "number.v2c_trydan_intensity"
      };
    }
    get cardBorder() { return 'rgba(0, 229, 255, 0.22)'; }
    renderContent(states, hass, config) {
if (typeof hass !== 'undefined' && hass) {
                window._haHass = hass;
              }

              // Install V2C Charging Profile & Amps Controllers
              if (!window._setV2cProfile) {
                window._setV2cProfile = function(profileName, modeNum, el) {
                  if (el) {
                    el.style.transform = 'scale(0.95)';
                    setTimeout(() => { el.style.transform = ''; }, 140);
                  }
                  try {
                    fetch('http://192.168.0.249/write/DynamicPowerMode=' + modeNum, { mode: 'no-cors' });
                  } catch(e) {}
                  if (window._callTeslaHa) {
                    window._callTeslaHa('input_select', 'select_option', {
                      entity_id: 'input_select.v2c_charging_profile',
                      option: profileName
                    }, el);
                    window._callTeslaHa('rest_command', 'v2c_set_dynamic_power_mode', {
                      mode: modeNum
                    }, el);
                  }
                };

                window._setV2cAmps = function(amps, el) {
                  if (el) {
                    el.style.transform = 'scale(0.92)';
                    setTimeout(() => { el.style.transform = ''; }, 140);
                  }
                  try {
                    fetch('http://192.168.0.249/write/Intensity=' + amps, { mode: 'no-cors' });
                  } catch(e) {}
                  if (window._callTeslaHa) {
                    window._callTeslaHa('number', 'set_value', {
                      entity_id: 'number.evse_192_168_0_249_intensity',
                      value: amps
                    }, el);
                  }
                };

                window._toggleV2cPause = function(currentlyPaused, el) {
                  if (el) {
                    el.style.transform = 'scale(0.92)';
                    setTimeout(() => { el.style.transform = ''; }, 140);
                  }
                  const nextPause = currentlyPaused ? 0 : 1;
                  try {
                    fetch('http://192.168.0.249/write/Paused=' + nextPause, { mode: 'no-cors' });
                  } catch(e) {}
                  if (window._callTeslaHa) {
                    window._callTeslaHa('switch', currentlyPaused ? 'turn_off' : 'turn_on', {
                      entity_id: 'switch.evse_192_168_0_249_pause_session'
                    }, el);
                  }
                };
              }

              const isConnected = states['binary_sensor.evse_192_168_0_249_connected']?.state === 'on';
              const isCharging = states['binary_sensor.evse_192_168_0_249_charging']?.state === 'on';
              const isLocked = states['switch.evse_192_168_0_249_lock_evse']?.state === 'on';
              const paused = states['switch.evse_192_168_0_249_pause_session']?.state === 'on';
              const dynamicMod = states['switch.evse_192_168_0_249_dynamic_intensity_modulation']?.state === 'on';

              const chargePwrW = Math.round(parseFloat(states['sensor.evse_192_168_0_249_charge_power']?.state) || 0);
              const chargePwrDisplay = chargePwrW >= 1000 ? (chargePwrW / 1000).toFixed(2) + ' kW' : chargePwrW + ' W';
              const currentAmps = Math.round(parseFloat(states['number.evse_192_168_0_249_intensity']?.state) || 0);
              const minAmps = Math.round(parseFloat(states['number.evse_192_168_0_249_min_intensity']?.state) || 6);
              const maxAmps = Math.round(parseFloat(states['number.evse_192_168_0_249_max_intensity']?.state) || 29);

              const solarPwrW = Math.round(parseFloat(states['sensor.evse_192_168_0_249_photovoltaic_power']?.state) || 0);
              const solarPwrDisplay = solarPwrW >= 1000 ? (solarPwrW / 1000).toFixed(2) + ' kW' : solarPwrW + ' W';

              const housePwrW = Math.round(parseFloat(states['sensor.evse_192_168_0_249_house_power']?.state) || 0);
              const housePwrDisplay = housePwrW >= 1000 ? (housePwrW / 1000).toFixed(2) + ' kW' : housePwrW + ' W';

              const sessionKwh = (parseFloat(states['sensor.evse_192_168_0_249_charge_energy']?.state) || 0).toFixed(2);
              const chargeTimeSec = parseFloat(states['sensor.evse_192_168_0_249_charge_time']?.state) || 0;
              let sessionDurationText = '0m';
              if (chargeTimeSec > 0) {
                const hours = Math.floor(chargeTimeSec / 3600);
                const mins = Math.round((chargeTimeSec % 3600) / 60);
                sessionDurationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
              }

              const activeProfile = states['input_select.v2c_charging_profile']?.state || 'FV + Min';
              const solarSurplusW = Math.max(0, solarPwrW - housePwrW);

              return `
                <div style="position: relative; pointer-events: auto !important; padding: 16px 14px 14px; box-sizing: border-box; width: 100%;">
                  
                  <!-- V2C Station Header -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(0, 230, 118, 0.12); border: 1px solid rgba(0, 230, 118, 0.3); display: flex; align-items: center; justify-content: center;">
                        <ha-icon icon="mdi:ev-station" style="color: #00e676; --mdc-icon-size: 22px;"></ha-icon>
                      </div>
                      <div>
                        <div style="font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px; line-height: 1.1;">V2C Trydan</div>
                      </div>
                    </div>

                    <div style="display: flex; gap: 6px;">
                      <!-- Plug Connection Pill -->
                      <div style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; background: ${isConnected ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${isConnected ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 255, 255, 0.1)'}; font-size: 9.5px; font-weight: 700; color: ${isConnected ? '#00e676' : 'rgba(255, 255, 255, 0.5)'};">
                        <ha-icon icon="${isConnected ? 'mdi:power-plug' : 'mdi:power-plug-off'}" style="--mdc-icon-size: 12px; color: ${isConnected ? '#00e676' : '#78909c'};"></ha-icon>
                        <span>${isConnected ? (isCharging ? 'Charging' : 'Connected') : 'Unplugged'}</span>
                      </div>

                      <!-- EVSE Lock Pill -->
                      <div onclick="window._callTeslaHa('switch', 'toggle', {entity_id: 'switch.evse_192_168_0_249_lock_evse'}, this);" style="cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; background: ${isLocked ? 'rgba(255, 82, 82, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${isLocked ? 'rgba(255, 82, 82, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; font-size: 9.5px; font-weight: 700; color: ${isLocked ? '#ff5252' : 'rgba(255, 255, 255, 0.7)'};">
                        <ha-icon icon="${isLocked ? 'mdi:lock' : 'mdi:lock-open-variant'}" style="--mdc-icon-size: 12px; color: ${isLocked ? '#ff5252' : 'rgba(255, 255, 255, 0.7)'};"></ha-icon>
                        <span>${isLocked ? 'Locked' : 'Unlocked'}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 3-Pillar Power Flow Realtime Metrics -->
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
                    
                    <!-- Solar PV Production -->
                    <div style="background: rgba(255, 179, 0, 0.08); border: 1px solid rgba(255, 179, 0, 0.25); border-radius: 12px; padding: 10px 8px; text-align: center;">
                      <div style="font-size: 9px; font-weight: 700; color: #ffb74d; text-transform: uppercase;">Solar PV</div>
                      <div style="font-size: 17px; font-weight: 900; color: #ffb74d; line-height: 1.2;">${solarPwrDisplay}</div>
                      <div style="font-size: 8px; color: rgba(255,255,255,0.5); font-weight: 600;">Surplus: ${(solarSurplusW/1000).toFixed(2)} kW</div>
                    </div>

                    <!-- House Base Load -->
                    <div style="background: rgba(0, 229, 255, 0.06); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 12px; padding: 10px 8px; text-align: center;">
                      <div style="font-size: 9px; font-weight: 700; color: #00e5ff; text-transform: uppercase;">House Load</div>
                      <div style="font-size: 17px; font-weight: 900; color: #00e5ff; line-height: 1.2;">${housePwrDisplay}</div>
                      <div style="font-size: 8px; color: rgba(255,255,255,0.5); font-weight: 600;">Base Power</div>
                    </div>

                    <!-- EV Charging Speed -->
                    <div style="background: ${isCharging ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 255, 255, 0.04)'}; border: 1px solid ${isCharging ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 255, 255, 0.08)'}; border-radius: 12px; padding: 10px 8px; text-align: center;">
                      <div style="font-size: 9px; font-weight: 700; color: ${isCharging ? '#00e676' : 'rgba(255,255,255,0.6)'}; text-transform: uppercase;">EV Charging</div>
                      <div style="font-size: 17px; font-weight: 900; color: ${isCharging ? '#00e676' : '#ffffff'}; line-height: 1.2;">${chargePwrDisplay}</div>
                      <div style="font-size: 8px; color: rgba(255,255,255,0.5); font-weight: 600;">${currentAmps} A</div>
                    </div>

                  </div>

                  <!-- 3 Distinct Charging Profiles with Prominent Active Border & Glow -->
                  <div style="margin-bottom: 12px;">
                    <div style="font-size: 9px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Charging Profiles</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                      
                      <!-- Profile 1: Solar Only -->
                      <div onclick="window._setV2cProfile('Solar Only', 2, this);"
                           style="cursor: pointer; background: ${activeProfile === 'Solar Only' ? 'rgba(255, 179, 0, 0.22)' : 'rgba(255, 255, 255, 0.03)'}; border: ${activeProfile === 'Solar Only' ? '2px solid #ffb74d' : '1px solid rgba(255, 255, 255, 0.08)'}; box-shadow: ${activeProfile === 'Solar Only' ? '0 0 14px rgba(255, 183, 77, 0.45)' : 'none'}; border-radius: 10px; padding: 8px 4px; text-align: center; transition: all 0.15s ease;">
                        <ha-icon icon="mdi:solar-power" style="color: #ffb74d; --mdc-icon-size: 18px;"></ha-icon>
                        <div style="font-size: 11px; font-weight: 800; color: #ffb74d; margin-top: 2px;">Solar Only</div>
                        <div style="font-size: 8px; color: rgba(255,255,255,0.5);">100% Surplus</div>
                      </div>

                      <!-- Profile 2: FV + Minimum Power -->
                      <div onclick="window._setV2cProfile('FV + Min', 3, this);"
                           style="cursor: pointer; background: ${activeProfile === 'FV + Min' ? 'rgba(0, 229, 255, 0.22)' : 'rgba(255, 255, 255, 0.03)'}; border: ${activeProfile === 'FV + Min' ? '2px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.08)'}; box-shadow: ${activeProfile === 'FV + Min' ? '0 0 14px rgba(0, 229, 255, 0.45)' : 'none'}; border-radius: 10px; padding: 8px 4px; text-align: center; transition: all 0.15s ease;">
                        <ha-icon icon="mdi:car-speed-limiter" style="color: #00e5ff; --mdc-icon-size: 18px;"></ha-icon>
                        <div style="font-size: 11px; font-weight: 800; color: #00e5ff; margin-top: 2px;">FV + Min</div>
                        <div style="font-size: 8px; color: rgba(255,255,255,0.5);">Solar + Min Grid</div>
                      </div>

                      <!-- Profile 3: Boost (Grid + Solar) -->
                      <div onclick="window._setV2cProfile('Boost', 4, this);"
                           style="cursor: pointer; background: ${activeProfile === 'Boost' ? 'rgba(244, 67, 54, 0.22)' : 'rgba(255, 255, 255, 0.03)'}; border: ${activeProfile === 'Boost' ? '2px solid #ef5350' : '1px solid rgba(255, 255, 255, 0.08)'}; box-shadow: ${activeProfile === 'Boost' ? '0 0 14px rgba(239, 83, 80, 0.45)' : 'none'}; border-radius: 10px; padding: 8px 4px; text-align: center; transition: all 0.15s ease;">
                        <ha-icon icon="mdi:rocket-launch" style="color: #ef5350; --mdc-icon-size: 18px;"></ha-icon>
                        <div style="font-size: 11px; font-weight: 800; color: #ef5350; margin-top: 2px;">Boost</div>
                        <div style="font-size: 8px; color: rgba(255,255,255,0.5);">Max Grid + Solar</div>
                      </div>

                    </div>
                  </div>

                  <!-- Quick Amperage Selectors -->
                  <div style="margin-bottom: 12px;">
                    <div style="font-size: 9px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Amperage Presets</div>
                    <div style="display: flex; justify-content: space-between; gap: 4px;">
                      ${[6, 10, 13, 16, 20, 29].map(a => `
                        <div onclick="window._setV2cAmps(${a}, this);" style="cursor: pointer; flex: 1; text-align: center; padding: 6px 0; border-radius: 8px; background: ${currentAmps === a ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 255, 255, 0.04)'}; border: 1px solid ${currentAmps === a ? '#00e676' : 'rgba(255, 255, 255, 0.08)'}; font-size: 11px; font-weight: 800; color: ${currentAmps === a ? '#00e676' : '#ffffff'};">
                          ${a}A
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <!-- Dynamic Modulation Toggle & Pause Button -->
                  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div>
                      <div style="font-size: 12px; font-weight: 800; color: #ffffff;">Dynamic Modulation</div>
                      <div style="font-size: 9px; color: rgba(255, 255, 255, 0.5);">Auto-adjusts Amps to home & solar</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <div onclick="window._callTeslaHa('switch', 'toggle', {entity_id: 'switch.evse_192_168_0_249_dynamic_intensity_modulation'}, this);" style="cursor: pointer; padding: 5px 10px; border-radius: 8px; background: ${dynamicMod ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${dynamicMod ? '#00e676' : 'rgba(255, 255, 255, 0.1)'}; font-size: 10px; font-weight: 800; color: ${dynamicMod ? '#00e676' : '#ffffff'};">
                        ${dynamicMod ? 'Active (ON)' : 'Disabled'}
                      </div>
                      <div onclick="window._toggleV2cPause(${paused ? 1 : 0}, this);" style="cursor: pointer; padding: 5px 10px; border-radius: 8px; background: ${paused ? 'rgba(255, 179, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${paused ? '#ffb74d' : 'rgba(255, 255, 255, 0.1)'}; font-size: 10px; font-weight: 800; color: ${paused ? '#ffb74d' : '#ffffff'};">
                        ${paused ? 'Paused' : 'Pause'}
                      </div>
                    </div>
                  </div>

                  <!-- Session Statistics Footer (Accurate hardware metrics) -->
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: rgba(255, 255, 255, 0.65); font-weight: 600; padding-top: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div>Session: <b style="color: #00e676;">${sessionKwh} kWh</b></div>
                      <span style="color: rgba(255,255,255,0.25);">•</span>
                      <div>Duration: <b style="color: #00e5ff;">${sessionDurationText}</b></div>
                    </div>
                    <div>Limits: <b>${minAmps}A min • ${maxAmps}A max</b></div>
                  </div>

                </div>
              `;
    }
  }
  customElements.define('tesla-charger-card', TeslaChargerCard);

  // 3. Car Charging & Session Energy Costs Card
  class TeslaChargingCostsCard extends BaseTeslaCard {
    static getStubConfig() {
      return {};
    }
    get cardBorder() { return 'rgba(0, 230, 118, 0.22)'; }
    renderContent(states, hass, config) {
const cardElement = this;
  const statsEnt = states['sensor.v2c_charging_stats'];
  const teslaEnergyEnt = states['sensor.tesla_ble_garage_charge_energy_added'];
  const teslaDistEnt = states['sensor.tesla_ble_garage_charge_distance_added'];
  const teslaStateEnt = states['sensor.tesla_ble_garage_charging_state'];
  
  const attrs = statsEnt ? statsEnt.attributes : {};
  const month = attrs.month_summary || {};
  const fw = attrs.firmware || {};
  const fwInstalled = fw.installed || '2.5.1';
  const fwUpdate = fw.update_available === true;
  const fwLatest = fw.latest || fwInstalled;

  const monthsDict = attrs.months || {};
  const sortedMonths = (attrs.sorted_months && attrs.sorted_months.length > 0) ? attrs.sorted_months : Object.keys(monthsDict);
  const currentMonthKey = sortedMonths.length > 0 ? sortedMonths[0] : '2026-10';

  if (!window._v2c_selected_month_key) {
    window._v2c_selected_month_key = currentMonthKey;
  }

  let activeMonthKey = window._v2c_selected_month_key;
  if (!monthsDict[activeMonthKey]) {
    activeMonthKey = currentMonthKey;
    window._v2c_selected_month_key = currentMonthKey;
  }

  const activeMonthData = monthsDict[activeMonthKey] || month;
  const activeMonthIdx = sortedMonths.indexOf(activeMonthKey);
  const canGoBack = activeMonthIdx < sortedMonths.length - 1;
  const canGoForward = activeMonthIdx > 0;
  const isCurrentMonth = (activeMonthKey === currentMonthKey);
  
  // Per-month sessions filtered to remove 0 kWh momentary handshakes
  const rawMonthSessions = activeMonthData.sessions || [];
  const monthSessions = rawMonthSessions.filter(s => (s.energy_kwh || 0) > 0.05);
  const hasSessions = (monthSessions.length > 0);
  
  const isCharging = teslaStateEnt && teslaStateEnt.state === 'Charging';
  
  // Robust touch & click event binding pattern from AresLab APsystems
  window._v2c_cost_card = cardElement;
  window._selectV2cSession = function(id, card) {
    if (!id) return;
    window._v2c_selected_session_id = Number(id);
    const targetCard = card || cardElement || window._v2c_cost_card;
    if (targetCard && typeof targetCard.requestUpdate === 'function') {
      targetCard.requestUpdate('_config');
    }
  };

  window._stepV2cMonth = function(dir, card) {
    const curIdx = sortedMonths.indexOf(window._v2c_selected_month_key || currentMonthKey);
    const newIdx = curIdx - dir;
    if (newIdx >= 0 && newIdx < sortedMonths.length) {
      window._v2c_selected_month_key = sortedMonths[newIdx];
      // Reset selected session so the newly selected month loads cleanly
      window._v2c_selected_session_id = null;
      const targetCard = card || cardElement || window._v2c_cost_card;
      if (targetCard && typeof targetCard.requestUpdate === 'function') {
        targetCard.requestUpdate('_config');
      }
    }
  };

  window._resetV2cMonth = function(card) {
    window._v2c_selected_month_key = currentMonthKey;
    window._v2c_selected_session_id = null;
    const targetCard = card || cardElement || window._v2c_cost_card;
    if (targetCard && typeof targetCard.requestUpdate === 'function') {
      targetCard.requestUpdate('_config');
    }
  };

  if (cardElement && !cardElement._v2cListenersAttached) {
    cardElement._v2cListenersAttached = true;
    let touchStartX = 0;
    let touchStartY = 0;
    window._isV2cScrolling = false;

    cardElement.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        window._isV2cScrolling = false;
      }
    }, { passive: true, capture: true });

    cardElement.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > 8 || dy > 8) {
          window._isV2cScrolling = true;
        }
      }
    }, { passive: true, capture: true });

    cardElement.addEventListener('touchend', (e) => {
      if (window._isV2cScrolling) {
        setTimeout(() => { window._isV2cScrolling = false; }, 80);
        return;
      }
      const path = e.composedPath ? e.composedPath() : [];
      for (let i = 0; i < path.length; i++) {
        const el = path[i];
        if (el && el.getAttribute) {
          if (el.getAttribute('data-action') === 'step-month') {
            const dir = parseInt(el.getAttribute('data-dir'), 10);
            window._stepV2cMonth(dir, cardElement);
            if (e.preventDefault) e.preventDefault();
            break;
          }
          if (el.getAttribute('data-action') === 'reset-month') {
            window._resetV2cMonth(cardElement);
            if (e.preventDefault) e.preventDefault();
            break;
          }
          if (el.getAttribute('data-session-id')) {
            const sid = el.getAttribute('data-session-id');
            window._selectV2cSession(sid, cardElement);
            break;
          }
        }
      }
    }, { passive: false, capture: true });

    cardElement.addEventListener('click', (e) => {
      if (window._isV2cScrolling) {
        e.stopPropagation();
        return;
      }
      const path = e.composedPath ? e.composedPath() : [];
      for (let i = 0; i < path.length; i++) {
        const el = path[i];
        if (el && el.getAttribute) {
          if (el.getAttribute('data-action') === 'step-month') {
            const dir = parseInt(el.getAttribute('data-dir'), 10);
            window._stepV2cMonth(dir, cardElement);
            e.stopPropagation();
            break;
          }
          if (el.getAttribute('data-action') === 'reset-month') {
            window._resetV2cMonth(cardElement);
            e.stopPropagation();
            break;
          }
          if (el.getAttribute('data-session-id')) {
            const sid = el.getAttribute('data-session-id');
            window._selectV2cSession(sid, cardElement);
            break;
          }
        }
      }
    }, true);
  }

  // Determine active session within the selected month
  let activeSession = null;
  if (window._v2c_selected_session_id && hasSessions) {
    activeSession = monthSessions.find(s => Number(s.id) === Number(window._v2c_selected_session_id));
  }
  // Default to first real charging session of this month if none selected or not found
  if (!activeSession && hasSessions) {
    activeSession = monthSessions[0];
    window._v2c_selected_session_id = Number(activeSession.id);
  }
  
  // Calculate top KPI values based on active session or active month totals
  const energyKwh = hasSessions && activeSession
    ? activeSession.energy_kwh.toFixed(2)
    : (activeMonthData.energy_kwh !== undefined ? activeMonthData.energy_kwh.toFixed(2) : '0.00');

  const distAdded = hasSessions && activeSession
    ? Math.round(parseFloat(energyKwh) * 6.5)
    : (activeMonthData.energy_kwh ? Math.round(activeMonthData.energy_kwh * 6.5) : 0);

  const costEur = hasSessions && activeSession
    ? (activeSession.cost_eur !== undefined ? activeSession.cost_eur.toFixed(2) : '0.00')
    : (activeMonthData.cost_eur !== undefined ? activeMonthData.cost_eur.toFixed(2) : '0.00');

  const savingsEur = hasSessions && activeSession
    ? (activeSession.savings_eur !== undefined ? activeSession.savings_eur.toFixed(2) : '0.00')
    : (activeMonthData.savings_eur !== undefined ? activeMonthData.savings_eur.toFixed(2) : '0.00');

  const sessionDate = hasSessions && activeSession ? (activeSession.date_short || 'Charge Session') : (activeMonthData.full_label || activeMonthData.label || 'October 2026');
  const sessionDur = hasSessions && activeSession ? (activeSession.duration || '0m') : (activeMonthData.time || '0m');
  
  const headerSubtitle = isCharging
    ? '⚡ Charging in progress...'
    : (hasSessions ? `${sessionDate} • ${sessionDur}` : `${activeMonthData.full_label || activeMonthData.label || 'October 2026'} • No charges recorded yet`);

  // Build hourly rows for the active session
  let hourlyHtml = '';
  const hourly = (hasSessions && activeSession && activeSession.hourly) ? activeSession.hourly : [];
  let maxHourlyKwh = 1;
  for (const h of hourly) {
    if (h.total_kwh > maxHourlyKwh) maxHourlyKwh = h.total_kwh;
  }
  
  for (const h of hourly) {
    const barPct = Math.min(100, Math.round((h.total_kwh / maxHourlyKwh) * 100));
    const solarRatio = h.total_kwh > 0 ? (h.solar_kwh / h.total_kwh) : 0;
    const solarBarPct = Math.round(barPct * solarRatio);
    const gridBarPct = barPct - solarBarPct;
    
    const rateText = h.solar_kwh >= h.total_kwh 
      ? '<span style="color: #00e676; font-weight: 600;">☀️ Solar Free</span>'
      : ('× ' + h.rate.toFixed(4) + ' € <span style="opacity:0.6; font-size:9px;">(' + h.tramo + ')</span>');
      
    hourlyHtml += `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
        <span style="width: 42px; font-weight: 700; color: #cfd8dc;">${h.hour}</span>
        
        <div style="flex: 1; margin: 0 10px; height: 16px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; display: flex;">
          <div style="width: ${solarBarPct}%; background: linear-gradient(90deg, #00c853, #00e676); height: 100%;" title="Solar"></div>
          <div style="width: ${gridBarPct}%; background: linear-gradient(90deg, #e6a117, #ffd54f); height: 100%;" title="Grid"></div>
        </div>
        
        <div style="width: 62px; font-weight: 600; text-align: right; color: #ffffff;">${h.total_kwh.toFixed(2)} kWh</div>
        <div style="width: 110px; text-align: right; font-size: 10px; color: #90a4ae;">${rateText}</div>
        <div style="width: 45px; text-align: right; font-weight: 700; color: #ffd54f;">${h.cost.toFixed(2)} €</div>
      </div>
    `;
  }
  
  // Build recent sessions rows for the selected month (Clickable!)
  let sessionsHtml = '';
  for (let i = 0; i < Math.min(6, monthSessions.length); i++) {
    const s = monthSessions[i];
    const isSelected = activeSession && (Number(s.id) === Number(activeSession.id));
    sessionsHtml += `
      <div class="v2c-session-row"
           data-session-id="${s.id}"
           style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 6px; border-radius: 8px; cursor: pointer !important; pointer-events: auto !important; touch-action: manipulation; transition: all 0.2s ease; background: ${isSelected ? 'rgba(0, 230, 118, 0.14)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isSelected ? 'rgba(0, 230, 118, 0.5)' : 'rgba(255, 255, 255, 0.05)'}; ${isSelected ? 'box-shadow: 0 0 10px rgba(0, 230, 118, 0.12);' : ''} font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 8px; pointer-events: none;">
          <span style="font-weight: ${isSelected ? '700' : '600'}; color: ${isSelected ? '#ffffff' : '#cfd8dc'};">${s.date_short}</span>
          <span style="background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 4px; font-size: 10px; color: #b0bec5;">${s.duration}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; pointer-events: none;">
          <span style="color: #00e5ff; font-weight: 600;">⚡ ${s.energy_kwh} kWh</span>
          <span style="color: #ffd54f; font-weight: 700;">${(s.cost_eur || 0).toFixed(2)} €</span>
          <span style="color: #00e676; font-weight: 600; font-size: 10px;">☀️ +${(s.savings_eur || 0).toFixed(2)} €</span>
        </div>
      </div>
    `;
  }

  // Header Status Pill
  let statusBadgeHtml = '';
  if (fwUpdate) {
    statusBadgeHtml = '<div style="background: rgba(255, 171, 0, 0.12); border: 1px solid rgba(255, 171, 0, 0.4); padding: 3px 8px; border-radius: 14px; font-size: 9.5px; font-weight: 700; color: #ffab00; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;"><span>⚠️ Update v' + fwLatest + '</span></div>';
  } else {
    statusBadgeHtml = '<div style="background: rgba(0, 230, 118, 0.1); border: 1px solid rgba(0, 230, 118, 0.25); padding: 3px 8px; border-radius: 14px; font-size: 9.5px; font-weight: 700; color: #00e676; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00e676; box-shadow: 0 0 6px #00e676;"></span><span>v' + fwInstalled + '</span><span style="color: #78909c; font-weight: 500;">• Synced</span></div>';
  }

  // Stepper Reset Button
  let resetBtnHtml = '';
  if (!isCurrentMonth) {
    resetBtnHtml = '<button data-action="reset-month" style="background: rgba(0, 230, 118, 0.15); border: 1px solid rgba(0, 230, 118, 0.5); color: #00e676; font-size: 9.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; touch-action: manipulation; box-shadow: 0 0 8px rgba(0,230,118,0.2);"><span style="font-size: 11px; line-height: 1;">↺</span><span>Now</span></button>';
  } else {
    resetBtnHtml = '<span style="font-size: 8.5px; color: #78909c; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); padding: 2px 6px; border-radius: 4px; font-weight: 600;">Current</span>';
  }

  return `
    <div style="position: relative; pointer-events: auto !important;">
      <!-- Card Header: Title & Unified Status Pill (Single Line) -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(0, 230, 118, 0.15); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0, 230, 118, 0.25);">
            <ha-icon icon="mdi:cash-multiple" style="color: #00e676; --mdc-icon-size: 18px;"></ha-icon>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #ffffff; white-space: nowrap;">Car Charging & Costs</div>
            <div style="font-size: 10px; color: #78909c; white-space: nowrap;">${headerSubtitle}</div>
          </div>
        </div>
        
        <div style="flex-shrink: 0;">
          ${statusBadgeHtml}
        </div>
      </div>

      <!-- Top 3 KPI Tiles -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px;">
        <!-- Energy -->
        <div style="background: rgba(255, 255, 255, 0.04); border-radius: 14px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #90a4ae; margin-bottom: 4px;">Energy</div>
          <div style="font-size: 20px; font-weight: 800; color: #ffffff;">${energyKwh} <span style="font-size: 11px; font-weight: 500; color: #b0bec5;">kWh</span></div>
          <div style="font-size: 9px; color: #00e5ff; margin-top: 2px;">${hasSessions ? 'Session Total' : 'Month Total'}</div>
        </div>

        <!-- Added Range -->
        <div style="background: rgba(255, 255, 255, 0.04); border-radius: 14px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #90a4ae; margin-bottom: 4px;">Added Range</div>
          <div style="font-size: 20px; font-weight: 800; color: #ffffff;">${distAdded} <span style="font-size: 11px; font-weight: 500; color: #b0bec5;">km</span></div>
          <div style="font-size: 9px; color: #81c784; margin-top: 2px;">${hasSessions ? 'Session Est.' : 'Month Est.'}</div>
        </div>

        <!-- Cost & Savings -->
        <div style="background: rgba(255, 255, 255, 0.04); border-radius: 14px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #90a4ae; margin-bottom: 4px;">Cost</div>
          <div style="font-size: 20px; font-weight: 800; color: #ffd54f;">${costEur} €</div>
          <div style="font-size: 9px; color: #00e676; margin-top: 2px; font-weight: 600;">☀️ Solar Saved ${savingsEur} €</div>
        </div>
      </div>

      <!-- Section: Hour by Hour -->
      <div style="background: rgba(0, 0, 0, 0.25); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; border: 1px solid rgba(255, 255, 255, 0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #eceff1;">Hour by Hour • ${hasSessions ? sessionDate : (activeMonthData.full_label || activeMonthData.label || 'October 2026')}</span>
          <div style="display: flex; align-items: center; gap: 8px; font-size: 9px;">
            <span style="display: inline-flex; align-items: center; gap: 3px;"><span style="width: 8px; height: 8px; border-radius: 2px; background: #00e676;"></span> Solar</span>
            <span style="display: inline-flex; align-items: center; gap: 3px;"><span style="width: 8px; height: 8px; border-radius: 2px; background: #ffd54f;"></span> Grid</span>
          </div>
        </div>
        ${hourlyHtml || `<div style="text-align:center; padding: 12px 10px; color: #78909c; font-size: 11px;">${hasSessions ? 'No hourly breakdown available for this session' : 'No charging activity in ' + (activeMonthData.full_label || activeMonthData.label || 'this month')}</div>`}
      </div>

      <!-- Section: Sessions of Selected Month (Click any row to view) -->
      <div style="background: rgba(0, 0, 0, 0.25); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; border: 1px solid rgba(255, 255, 255, 0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #eceff1;">${activeMonthData.label || 'Monthly'} Sessions (${monthSessions.length})</span>
          <span style="font-size: 9.5px; color: #78909c;">${hasSessions ? 'Tap session to view details' : 'No records'}</span>
        </div>
        ${sessionsHtml || `<div style="text-align:center; padding: 12px 10px; color: #78909c; font-size: 11px;">No charging sessions recorded in ${activeMonthData.full_label || activeMonthData.label || 'this month'}</div>`}
      </div>

      <!-- Section: Monthly Summary (Prominent Stepper & Reset Button) -->
      <div style="background: rgba(0, 0, 0, 0.25); border-radius: 14px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          
          <!-- Left: Prominent Month Stepper + Now Button -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 8px; padding: 2px;">
              <button data-action="step-month" data-dir="-1"
                      style="background: ${canGoBack ? 'rgba(255,255,255,0.12)' : 'transparent'}; border: none; color: ${canGoBack ? '#ffffff' : 'rgba(255,255,255,0.2)'}; font-size: 14px; font-weight: 900; cursor: pointer; padding: 3px 8px; border-radius: 5px; touch-action: manipulation;"
                      ${canGoBack ? '' : 'disabled'}>‹</button>
              
              <span style="font-size: 11px; font-weight: 800; color: #ffffff; padding: 0 6px; letter-spacing: 0.3px; white-space: nowrap;">
                ${activeMonthData.label || activeMonthKey}
              </span>
              
              <button data-action="step-month" data-dir="1"
                      style="background: ${canGoForward ? 'rgba(255,255,255,0.12)' : 'transparent'}; border: none; color: ${canGoForward ? '#ffffff' : 'rgba(255,255,255,0.2)'}; font-size: 14px; font-weight: 900; cursor: pointer; padding: 3px 8px; border-radius: 5px; touch-action: manipulation;"
                      ${canGoForward ? '' : 'disabled'}>›</button>
            </div>

            ${resetBtnHtml}
          </div>

          <!-- Right: Avg Rate Badge -->
          <span style="font-size: 9.5px; color: #00e676; font-weight: 800; background: rgba(0, 230, 118, 0.1); border: 1px solid rgba(0, 230, 118, 0.25); padding: 2px 8px; border-radius: 6px; white-space: nowrap;">
            Avg: ${(activeMonthData.avg_rate_kwh || 0).toFixed(3)} €/kWh
          </span>
        </div>

        <!-- 4 Grid Tiles -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
          <!-- Duration -->
          <div style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 7px 4px; text-align: center;">
            <div style="font-size: 8px; font-weight: 700; color: #78909c; text-transform: uppercase; letter-spacing: 0.4px;">Duration</div>
            <div style="font-size: 12.5px; font-weight: 800; color: #ffffff; margin-top: 3px; line-height: 1.1;">${activeMonthData.time || '0m'}</div>
          </div>
          <!-- Total Energy -->
          <div style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(0, 229, 255, 0.15); border-radius: 8px; padding: 7px 4px; text-align: center;">
            <div style="font-size: 8px; font-weight: 700; color: #78909c; text-transform: uppercase; letter-spacing: 0.4px;">Total Energy</div>
            <div style="font-size: 12.5px; font-weight: 800; color: #00e5ff; margin-top: 3px; line-height: 1.1;">${(activeMonthData.energy_kwh || 0).toFixed(1)} <span style="font-size: 8.5px; color: #78909c; font-weight: 600;">kWh</span></div>
          </div>
          <!-- Net Cost -->
          <div style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 213, 79, 0.15); border-radius: 8px; padding: 7px 4px; text-align: center;">
            <div style="font-size: 8px; font-weight: 700; color: #78909c; text-transform: uppercase; letter-spacing: 0.4px;">Net Cost</div>
            <div style="font-size: 12.5px; font-weight: 800; color: #ffd54f; margin-top: 3px; line-height: 1.1;">${(activeMonthData.cost_eur || 0).toFixed(2)} €</div>
          </div>
          <!-- Solar Saved -->
          <div style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(0, 230, 118, 0.15); border-radius: 8px; padding: 7px 4px; text-align: center;">
            <div style="font-size: 8px; font-weight: 700; color: #78909c; text-transform: uppercase; letter-spacing: 0.4px;">Solar Saved</div>
            <div style="font-size: 12.5px; font-weight: 800; color: #00e676; margin-top: 3px; line-height: 1.1;">☀️ ${(activeMonthData.savings_eur || 0).toFixed(2)} €</div>
          </div>
        </div>
      </div>
    </div>
  `;
    }
  }
  customElements.define('tesla-charging-costs-card', TeslaChargingCostsCard);

  // 4. MITECO Fuel Savings Benchmark Card
  class TeslaSavingsCard extends BaseTeslaCard {
    static getStubConfig() {
      return {
        fuel_price_gasolina_95: "sensor.fuel_price_gasolina_95",
        monthly_mileage: "sensor.tesla_monthly_mileage"
      };
    }
    get cardBorder() { return 'rgba(255, 152, 0, 0.22)'; }
    renderContent(states, hass, config) {
const cardElement = this;
  const odoEnt = states['sensor.tesla_ble_garage_odometer'];
  const fuelEnt = states['sensor.fuel_price_gasolina_95'];
  const monthDistEnt = states['sensor.mr_white_monthly_mileage'];
  const rangeEnt = states['sensor.tesla_ble_garage_range'];
  const socEnt = states['sensor.tesla_ble_garage_charge_level'];
  const energyAddedEnt = states['sensor.tesla_ble_garage_charge_energy_added'];
  const distAddedEnt = states['sensor.tesla_ble_garage_charge_distance_added'];

  const odoKm = parseFloat(odoEnt?.state) || 14997.2;
  const gasPrice = parseFloat(fuelEnt?.state) || 1.805;
  const monthDistKm = parseFloat(monthDistEnt?.state) || 124.5;
  const rangeKm = parseFloat(rangeEnt?.state) || 338.8;
  const soc = parseFloat(socEnt?.state) || 76;
  const lastEnergy = parseFloat(energyAddedEnt?.state) || 2.26;
  const lastDist = parseFloat(distAddedEnt?.state) || 16.9;

  // Format numbers nicely
  const fmtEur = (n) => (n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtKm = (n) => Math.round(n || 0).toLocaleString('de-DE');
  const fmtL = (n) => Math.round(n || 0).toLocaleString('de-DE');

  // Interactive user state
  if (!window._mrwhite_ice_l) window._mrwhite_ice_l = 6.0;
  if (!window._mrwhite_tab) window._mrwhite_tab = 'lifetime';

  const iceL = window._mrwhite_ice_l;
  const activeTab = window._mrwhite_tab;

  // Real vehicle parameters
  // Tesla Highland efficiency: ~14.5 kWh/100 km (~6.9 km/kWh)
  const teslaKwh100km = 14.5;
  // User's real home electricity rate (solar + off-peak weighted): 0.0339 €/kWh
  const teslaHomeEurKwh = 0.0339;

  // Per 100 km cost comparison
  const iceCost100km = iceL * gasPrice;
  const teslaCost100km = (teslaKwh100km * teslaHomeEurKwh);
  const delta100km = Math.max(0, iceCost100km - teslaCost100km);
  const pctSaved = Math.min(99.5, ((delta100km / iceCost100km) * 100));

  // Horizon calculations
  let horizonMetricTitle = 'Distance Driven';
  let horizonLabel = '';
  let horizonDistance = 0;
  let horizonPetrolDisplaced = 0;
  let horizonNetSavedEur = 0;
  let horizonTeslaCost = 0;
  let horizonGasCost = 0;
  let horizonCo2Kg = 0;
  let horizonDisplacedSubtitle = '';

  if (activeTab === 'lifetime') {
    horizonMetricTitle = 'Total Mileage';
    horizonLabel = 'Total Lifetime Odometer';
    horizonDistance = odoKm;
    horizonPetrolDisplaced = (odoKm / 100) * iceL;
    horizonGasCost = horizonPetrolDisplaced * gasPrice;
    horizonTeslaCost = (odoKm / 100) * teslaKwh100km * teslaHomeEurKwh;
    horizonNetSavedEur = horizonGasCost - horizonTeslaCost;
    horizonCo2Kg = horizonPetrolDisplaced * 2.31;
    horizonDisplacedSubtitle = `Across ${fmtKm(horizonDistance)} km driven`;
  } else if (activeTab === 'month') {
    horizonMetricTitle = 'Distance Driven';
    horizonLabel = 'Driven in October 2026';
    horizonDistance = monthDistKm;
    horizonPetrolDisplaced = (monthDistKm / 100) * iceL;
    horizonGasCost = horizonPetrolDisplaced * gasPrice;
    horizonTeslaCost = (monthDistKm / 100) * teslaKwh100km * teslaHomeEurKwh;
    horizonNetSavedEur = Math.max(0, horizonGasCost - horizonTeslaCost);
    horizonCo2Kg = horizonPetrolDisplaced * 2.31;
    horizonDisplacedSubtitle = `Across ${fmtKm(horizonDistance)} km driven this month`;
  } else if (activeTab === 'pack' || activeTab === 'range') {
    horizonMetricTitle = 'Remaining Range';
    horizonLabel = 'Current Battery Estimate (' + Math.round(soc) + '% SoC)';
    horizonDistance = rangeKm;
    horizonPetrolDisplaced = (rangeKm / 100) * iceL;
    horizonGasCost = horizonPetrolDisplaced * gasPrice;
    horizonTeslaCost = (rangeKm / 100) * teslaKwh100km * teslaHomeEurKwh;
    horizonNetSavedEur = horizonGasCost - horizonTeslaCost;
    horizonCo2Kg = horizonPetrolDisplaced * 2.31;
    horizonDisplacedSubtitle = `For ${fmtKm(horizonDistance)} km stored range`;
  } else if (activeTab === 'session') {
    horizonMetricTitle = 'Range Added';
    horizonLabel = 'Most Recent Charge (+' + lastEnergy.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kWh)';
    horizonDistance = lastDist;
    horizonPetrolDisplaced = (lastDist / 100) * iceL;
    horizonGasCost = horizonPetrolDisplaced * gasPrice;
    horizonTeslaCost = lastEnergy * teslaHomeEurKwh;
    horizonNetSavedEur = Math.max(0, horizonGasCost - horizonTeslaCost);
    horizonCo2Kg = horizonPetrolDisplaced * 2.31;
    horizonDisplacedSubtitle = `For +${lastDist.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km added range`;
  }

  // Interactive Click Handlers (AresLab touch & click binding)
  window._setMrWhiteIce = function(liters, el) {
    window._mrwhite_ice_l = parseFloat(liters);
    if (cardElement && typeof cardElement.requestUpdate === 'function') {
      cardElement.requestUpdate('_config');
    }
  };

  window._setMrWhiteTab = function(tab, el) {
    window._mrwhite_tab = tab;
    if (cardElement && typeof cardElement.requestUpdate === 'function') {
      cardElement.requestUpdate('_config');
    }
  };

  if (cardElement && !cardElement._savingsListenersAttached) {
    cardElement._savingsListenersAttached = true;
    let touchStartX = 0;
    let touchStartY = 0;
    let isScrolling = false;

    cardElement.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isScrolling = false;
      }
    }, { passive: true, capture: true });

    cardElement.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > 8 || dy > 8) isScrolling = true;
      }
    }, { passive: true, capture: true });

    const handleAction = (e) => {
      if (isScrolling) return;
      const path = e.composedPath ? e.composedPath() : [];
      for (let i = 0; i < path.length; i++) {
        const el = path[i];
        if (el && el.getAttribute) {
          if (el.getAttribute('data-action') === 'set-ice') {
            const val = el.getAttribute('data-val');
            window._setMrWhiteIce(val, cardElement);
            if (e.preventDefault) e.preventDefault();
            e.stopPropagation();
            break;
          }
          if (el.getAttribute('data-action') === 'set-tab') {
            const val = el.getAttribute('data-val');
            window._setMrWhiteTab(val, cardElement);
            if (e.preventDefault) e.preventDefault();
            e.stopPropagation();
            break;
          }
        }
      }
    };

    cardElement.addEventListener('touchend', handleAction, { passive: false, capture: true });
    cardElement.addEventListener('click', handleAction, true);
  }

  return `
    <div style="position: relative; pointer-events: auto !important;">
      <!-- Header: Title & Live MITECO Status Pill -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(0, 230, 118, 0.15); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0, 230, 118, 0.25);">
            <ha-icon icon="mdi:gas-station-off" style="color: #00e676; --mdc-icon-size: 18px;"></ha-icon>
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: #ffffff; white-space: nowrap;">Mr White • Fuel Savings</div>
            <div style="font-size: 9.5px; color: #78909c; white-space: nowrap;">Real-Time MITECO • 100% Home Solar</div>
          </div>
        </div>
        
        <div style="flex-shrink: 0;">
          <div style="background: rgba(0, 230, 118, 0.1); border: 1px solid rgba(0, 230, 118, 0.25); padding: 3px 7px; border-radius: 14px; font-size: 9px; font-weight: 700; color: #00e676; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #00e676; box-shadow: 0 0 5px #00e676;"></span>
            <span>${(gasPrice || 0).toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/L • MITECO</span>
          </div>
        </div>
      </div>

      <!-- Cost per 100 km Comparison Banner -->
      <div style="background: rgba(0, 0, 0, 0.25); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #eceff1;">Cost per 100 km Comparison</span>
          <span style="font-size: 9.5px; font-weight: 800; color: #00e676; background: rgba(0, 230, 118, 0.12); padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(0, 230, 118, 0.3);">
            ⚡ ${pctSaved.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% CHEAPER
          </span>
        </div>

        <!-- Comparative Visual Bars -->
        <div style="display: flex; flex-direction: column; gap: 7px; margin: 10px 0;">
          <!-- Mr White Tesla -->
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
            <div style="width: 105px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #00e676; box-shadow: 0 0 5px #00e676;"></span>
              <span>Mr White</span>
            </div>
            <div style="flex: 1; margin: 0 8px; height: 14px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
              <div style="width: ${Math.max(4, Math.round((teslaCost100km / iceCost100km) * 100))}%; height: 100%; background: linear-gradient(90deg, #00c853, #00e676); border-radius: 4px; box-shadow: 0 0 8px rgba(0, 230, 118, 0.4);"></div>
            </div>
            <div style="width: 50px; text-align: right; font-weight: 800; color: #00e676; font-size: 11px;">${teslaCost100km.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
          </div>

          <!-- Gasoline 95 Baseline -->
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
            <div style="width: 105px; font-weight: 600; color: #cfd8dc; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #ff5252;"></span>
              <span>Gas 95 (${iceL.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L)</span>
            </div>
            <div style="flex: 1; margin: 0 8px; height: 14px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #d32f2f, #ff5252); border-radius: 4px;"></div>
            </div>
            <div style="width: 50px; text-align: right; font-weight: 800; color: #ff5252; font-size: 11px;">${iceCost100km.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
          </div>
        </div>

        <!-- Cost Delta Ribbon -->
        <div style="margin-top: 10px; padding: 6px 10px; background: rgba(0, 230, 118, 0.08); border: 1px solid rgba(0, 230, 118, 0.2); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
          <span style="color: #b0bec5;">Net Savings Every 100 km:</span>
          <span style="font-weight: 800; color: #00e676; font-size: 11px;">+${delta100km.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € saved / 100 km</span>
        </div>
      </div>

      <!-- Controls: ICE Class Selector & Horizon Tabs -->
      <div style="background: rgba(0, 0, 0, 0.25); border-radius: 14px; padding: 12px; margin-bottom: 14px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <!-- Top: Vehicle Comparison Class -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 9.5px; font-weight: 700; color: #90a4ae; text-transform: uppercase; letter-spacing: 0.5px;">ICE Baseline:</span>
          <div style="display: flex; gap: 4px;">
            <button data-action="set-ice" data-val="4.5" style="background: ${iceL === 4.5 ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 255, 255, 0.04)'}; border: 1px solid ${iceL === 4.5 ? '#00e676' : 'rgba(255, 255, 255, 0.1)'}; color: ${iceL === 4.5 ? '#00e676' : '#b0bec5'}; font-size: 9px; font-weight: 700; padding: 3px 7px; border-radius: 6px; cursor: pointer; touch-action: manipulation;">4.5L Compact</button>
            <button data-action="set-ice" data-val="6.0" style="background: ${iceL === 6.0 ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 255, 255, 0.04)'}; border: 1px solid ${iceL === 6.0 ? '#00e676' : 'rgba(255, 255, 255, 0.1)'}; color: ${iceL === 6.0 ? '#00e676' : '#b0bec5'}; font-size: 9px; font-weight: 700; padding: 3px 7px; border-radius: 6px; cursor: pointer; touch-action: manipulation;">6.0L Saloon ★</button>
            <button data-action="set-ice" data-val="7.5" style="background: ${iceL === 7.5 ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 255, 255, 0.04)'}; border: 1px solid ${iceL === 7.5 ? '#00e676' : 'rgba(255, 255, 255, 0.1)'}; color: ${iceL === 7.5 ? '#00e676' : '#b0bec5'}; font-size: 9px; font-weight: 700; padding: 3px 7px; border-radius: 6px; cursor: pointer; touch-action: manipulation;">7.5L SUV</button>
          </div>
        </div>

        <!-- Horizon Selector Tabs -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background: rgba(255, 255, 255, 0.03); padding: 3px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <button data-action="set-tab" data-val="lifetime" style="background: ${activeTab === 'lifetime' ? 'rgba(0, 230, 118, 0.22)' : 'transparent'}; border: 1px solid ${activeTab === 'lifetime' ? 'rgba(0, 230, 118, 0.5)' : 'transparent'}; color: ${activeTab === 'lifetime' ? '#ffffff' : '#90a4ae'}; font-size: 8.5px; font-weight: ${activeTab === 'lifetime' ? '800' : '600'}; padding: 5px 2px; border-radius: 6px; cursor: pointer; touch-action: manipulation; white-space: nowrap; text-align: center;">Lifetime</button>
          <button data-action="set-tab" data-val="month" style="background: ${activeTab === 'month' ? 'rgba(0, 230, 118, 0.22)' : 'transparent'}; border: 1px solid ${activeTab === 'month' ? 'rgba(0, 230, 118, 0.5)' : 'transparent'}; color: ${activeTab === 'month' ? '#ffffff' : '#90a4ae'}; font-size: 8.5px; font-weight: ${activeTab === 'month' ? '800' : '600'}; padding: 5px 2px; border-radius: 6px; cursor: pointer; touch-action: manipulation; white-space: nowrap; text-align: center;">This Month</button>
          <button data-action="set-tab" data-val="range" style="background: ${(activeTab === 'pack' || activeTab === 'range') ? 'rgba(0, 230, 118, 0.22)' : 'transparent'}; border: 1px solid ${(activeTab === 'pack' || activeTab === 'range') ? 'rgba(0, 230, 118, 0.5)' : 'transparent'}; color: ${(activeTab === 'pack' || activeTab === 'range') ? '#ffffff' : '#90a4ae'}; font-size: 8.5px; font-weight: ${(activeTab === 'pack' || activeTab === 'range') ? '800' : '600'}; padding: 5px 2px; border-radius: 6px; cursor: pointer; touch-action: manipulation; white-space: nowrap; text-align: center;">Current Range</button>
          <button data-action="set-tab" data-val="session" style="background: ${activeTab === 'session' ? 'rgba(0, 230, 118, 0.22)' : 'transparent'}; border: 1px solid ${activeTab === 'session' ? 'rgba(0, 230, 118, 0.5)' : 'transparent'}; color: ${activeTab === 'session' ? '#ffffff' : '#90a4ae'}; font-size: 8.5px; font-weight: ${activeTab === 'session' ? '800' : '600'}; padding: 5px 2px; border-radius: 6px; cursor: pointer; touch-action: manipulation; white-space: nowrap; text-align: center;">Last Charge</button>
        </div>
      </div>

      <!-- Active Horizon KPI Summary (4 Prominent Glass Tiles) -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 6px;">
        <!-- Total Euro Saved -->
        <div style="background: rgba(0, 230, 118, 0.08); border-radius: 14px; padding: 12px; border: 1px solid rgba(0, 230, 118, 0.25); text-align: center;">
          <div style="font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #00e676; font-weight: 700; margin-bottom: 4px;">Net Money Saved</div>
          <div style="font-size: 21px; font-weight: 900; color: #ffffff;">+${fmtEur(horizonNetSavedEur)} <span style="font-size: 12px; font-weight: 600; color: #00e676;">€</span></div>
          <div style="font-size: 8.5px; color: #b0bec5; margin-top: 3px;">Gas: ${fmtEur(horizonGasCost)} € vs Tesla: ${fmtEur(horizonTeslaCost)} €</div>
        </div>

        <!-- Petrol Displaced -->
        <div style="background: rgba(255, 255, 255, 0.04); border-radius: 14px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
          <div style="font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #00e5ff; font-weight: 700; margin-bottom: 4px;">Petrol Displaced</div>
          <div style="font-size: 21px; font-weight: 900; color: #ffffff;">${fmtL(horizonPetrolDisplaced)} <span style="font-size: 12px; font-weight: 600; color: #00e5ff;">Liters</span></div>
          <div style="font-size: 8.5px; color: #b0bec5; margin-top: 3px;">${horizonDisplacedSubtitle}</div>
        </div>

        <!-- Dynamic Mileage/Range Tile -->
        <div style="background: rgba(255, 255, 255, 0.04); border-radius: 14px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
          <div style="font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #ffd54f; font-weight: 700; margin-bottom: 4px;">${horizonMetricTitle}</div>
          <div style="font-size: 19px; font-weight: 800; color: #ffffff;">${fmtKm(horizonDistance)} <span style="font-size: 12px; font-weight: 600; color: #ffd54f;">km</span></div>
          <div style="font-size: 8.5px; color: #78909c; margin-top: 3px;">${horizonLabel}</div>
        </div>

        <!-- CO2 Avoided -->
        <div style="background: rgba(255, 255, 255, 0.04); border-radius: 14px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
          <div style="font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #81c784; font-weight: 700; margin-bottom: 4px;">Emissions Avoided</div>
          <div style="font-size: 19px; font-weight: 800; color: #81c784;">${(horizonCo2Kg / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 12px; font-weight: 600; color: #a5d6a7;">Tonnes</span></div>
          <div style="font-size: 8.5px; color: #78909c; margin-top: 3px;">Avoided CO₂ (2.31 kg/L)</div>
        </div>
      </div>
    </div>
  `;
    }
  }
  customElements.define('tesla-savings-card', TeslaSavingsCard);

  // 5. Capital Recovery & Early Payoff ROI Dossier Card
  class TeslaRoiCard extends BaseTeslaCard {
    static getStubConfig() {
      return {};
    }
    get cardBorder() { return 'rgba(156, 39, 176, 0.25)'; }
    renderContent(states, hass, config) {
const cardElement = this;
  
  // Real live telemetry from HA entities
  const odoEnt = states['sensor.tesla_ble_garage_odometer'];
  const fuelEnt = states['sensor.fuel_price_gasolina_95'];
  const monthDistEnt = states['sensor.mr_white_monthly_mileage'];

  const odoKm = parseFloat(odoEnt?.state) || 15185.0;
  const gasPrice = parseFloat(fuelEnt?.state) || 1.805;
  const monthDistKm = parseFloat(monthDistEnt?.state) || 124.5;

  // European number formatting helpers (thousands: '.', decimals: ',')
  const fmtEur = (n) => (n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n) => Math.round(n || 0).toLocaleString('de-DE');
  const fmtDec1 = (n) => (n || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Interactive user preferences stored in window
  if (!window._mrwhite_roi_ice) window._mrwhite_roi_ice = 6.0;
  if (!window._mrwhite_roi_tax_adj) window._mrwhite_roi_tax_adj = false;

  const iceL = window._mrwhite_roi_ice;
  const isTaxAdj = window._mrwhite_roi_tax_adj;

  // Financial Baseline Constants (from purchase & loan contract)
  const grossPrice = 40000.0; // [DEMO] Replace with your vehicle purchase price
  const irpfSub = 3000.0;
  const caeSub = 650.0;
  // If tax-adjusted, reserve ~28% for IRPF on MOVES grant (~1,260 EUR)
  const movesNet = isTaxAdj ? 3240.0 : 4500.0;
  const totalSubsidies = irpfSub + caeSub + movesNet;
  const netAcquisitionCost = grossPrice - totalSubsidies;

  // Real operational costs
  const teslaKwh100km = 14.5;
  const teslaHomeEurKwh = 0.0339; // User's real solar & off-peak rate

  const iceCostKm = (iceL / 100.0) * gasPrice;
  const teslaCostKm = (teslaKwh100km / 100.0) * teslaHomeEurKwh;
  const deltaKm = Math.max(0, iceCostKm - teslaCostKm);

  // Dynamic Capital Amortization
  const lifetimeSavings = odoKm * deltaKm;
  const adjustedNetCost = Math.max(0, netAcquisitionCost - lifetimeSavings);
  const pctAmortized = Math.min(100, (lifetimeSavings / netAcquisitionCost) * 100);

  // Dynamic Monthly Cashflow
  const monthlyLoanPayment = 273.76;
  const thisMonthSavings = monthDistKm * deltaKm;
  
  // Real monthly average pace based on actual vehicle ownership (since 2025-07-18)
  const loanStartDate = new Date('2025-07-18');
  const now = new Date();
  const daysOwned = Math.max(30, Math.floor((now - loanStartDate) / (1000 * 60 * 60 * 24)));
  const monthsOwned = daysOwned / 30.4375;
  const avgMonthlyKm = odoKm / monthsOwned;
  const avgMonthlySavings = avgMonthlyKm * deltaKm;

  const avgOffsetPct = Math.min(100, (avgMonthlySavings / monthlyLoanPayment) * 100);
  const effectiveMonthlyOutPkt = Math.max(0, monthlyLoanPayment - avgMonthlySavings);

  // Auto Loan Schedule & Early Payoff (Jan 2028 target)
  const totalLoanInterest120m = 6801.36;
  const cuota1Date = new Date('2025-08-18');
  const currentCuotaNum = Math.max(1, Math.min(120, Math.floor((now - cuota1Date) / (1000 * 60 * 60 * 24 * 30.4375)) + 1));
  
  // Target Payoff: Cuota 29 (Dec 2027 / Jan 2028)
  const targetPayoffCapital = 18500.00; // [DEMO] Principal balance at payoff target month
  const interestPaidByTarget = 2736.26;
  const interestSavedByEarlyPayoff = totalLoanInterest120m - interestPaidByTarget;

  const targetDate = new Date('2028-01-01');
  const daysToTarget = Math.max(0, Math.floor((targetDate - now) / (1000 * 60 * 60 * 24)));
  const monthsToTarget = Math.round(daysToTarget / 30.4375);

  // Interactive toggle functions
  window._setRoiIce = function(l) {
    window._mrwhite_roi_ice = parseFloat(l);
    if (cardElement && typeof cardElement.requestUpdate === 'function') cardElement.requestUpdate('_config');
  };
  window._toggleRoiTax = function() {
    window._mrwhite_roi_tax_adj = !window._mrwhite_roi_tax_adj;
    if (cardElement && typeof cardElement.requestUpdate === 'function') cardElement.requestUpdate('_config');
  };

  return `
    <div style="position: relative; pointer-events: auto !important; width: 100%; box-sizing: border-box;">
      
      <!-- Card Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(255, 179, 0, 0.1); border: 1px solid rgba(255, 179, 0, 0.3); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(255, 179, 0, 0.15);">
            <ha-icon icon="mdi:finance" style="color: #ffb74d; --mdc-icon-size: 22px;"></ha-icon>
          </div>
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.3px;">Tesla Economics</div>
            <div style="font-size: 10.5px; color: rgba(255, 255, 255, 0.55); font-weight: 500;">Mr. White • Acquisition & Gas Offset</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; background: rgba(0, 229, 255, 0.12); border: 1px solid rgba(0, 229, 255, 0.35); font-size: 10px; font-weight: 800; color: #00e5ff;">
          <span>⚡ ${fmtDec1(pctAmortized)}% Recouped</span>
        </div>
      </div>

      <!-- Section 1: Net Car Price -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 12px 14px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-size: 9.5px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.5px;">Net Car Price</div>
          <div onclick="window._toggleRoiTax()" style="cursor: pointer; font-size: 9px; font-weight: 700; color: ${isTaxAdj ? '#ffd54f' : 'rgba(255, 255, 255, 0.5)'}; background: ${isTaxAdj ? 'rgba(255, 179, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; padding: 2px 7px; border-radius: 6px; border: 1px solid ${isTaxAdj ? 'rgba(255, 179, 0, 0.35)' : 'rgba(255, 255, 255, 0.1)'};">
            ${isTaxAdj ? 'MOVES: Tax-Reserved' : 'MOVES: Full Grant'} ⚙
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <div style="flex: 1; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 10px; padding: 8px 10px; text-align: center;">
            <div style="font-size: 8.5px; color: rgba(255, 255, 255, 0.5); font-weight: 600;">Gross Price</div>
            <div style="font-size: 13.5px; font-weight: 800; color: #ffffff; margin-top: 2px;">${fmtInt(grossPrice)} €</div>
          </div>
          <div style="color: rgba(255, 255, 255, 0.3); font-size: 12px; font-weight: 700;">➔</div>
          <div style="flex: 1; background: rgba(0, 230, 118, 0.06); border: 1px solid rgba(0, 230, 118, 0.2); border-radius: 10px; padding: 8px 10px; text-align: center;">
            <div style="font-size: 8.5px; color: #00e676; font-weight: 600;">Total Grants</div>
            <div style="font-size: 13.5px; font-weight: 800; color: #00e676; margin-top: 2px;">-${fmtInt(totalSubsidies)} €</div>
          </div>
          <div style="color: rgba(255, 255, 255, 0.3); font-size: 12px; font-weight: 700;">➔</div>
          <div style="flex: 1.1; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 10px; padding: 8px 10px; text-align: center; box-shadow: 0 0 10px rgba(0, 229, 255, 0.1);">
            <div style="font-size: 8.5px; color: #00e5ff; font-weight: 700;">Net Car Cost</div>
            <div style="font-size: 14.5px; font-weight: 900; color: #ffffff; margin-top: 2px;">${fmtInt(netAcquisitionCost)} €</div>
          </div>
        </div>

        <div style="font-size: 9px; color: rgba(255, 255, 255, 0.45); margin-top: 6px; text-align: center;">
          IRPF Deduct: -3.000 € • Plan MOVES: -${fmtInt(movesNet)} € • CAE: -650 €
        </div>
      </div>

      <!-- Section 2: Capital Amortization Progress -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 12px 14px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
          <div>
            <div style="font-size: 9px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase;">Total Gas Saved</div>
            <div style="font-size: 22px; font-weight: 900; color: #00e676; line-height: 1.1;">
              ${fmtEur(lifetimeSavings)} €
            </div>
            <div style="font-size: 8.5px; color: rgba(255, 255, 255, 0.45); margin-top: 1px;">Across ${fmtInt(odoKm)} km • displaced ${fmtInt(odoKm * iceL / 100)} L petrol</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase;">What You Really Paid</div>
            <div style="font-size: 22px; font-weight: 900; color: #00e5ff; line-height: 1.1;">
              ${fmtEur(adjustedNetCost)} €
            </div>
            <div style="font-size: 8.5px; color: rgba(255, 255, 255, 0.45); margin-top: 1px;">Net price minus gas saved</div>
          </div>
        </div>

        <!-- Amortization Bar -->
        <div style="position: relative; width: 100%; height: 14px; background: rgba(255, 255, 255, 0.08); border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.15); margin: 10px 0 8px; overflow: hidden;">
          <div style="position: absolute; left: 0; top: 0; width: ${pctAmortized}%; height: 100%; background: linear-gradient(90deg, #00e676 0%, #00e5ff 100%); box-shadow: 0 0 10px rgba(0, 230, 118, 0.5); transition: width 0.4s ease;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: rgba(255, 255, 255, 0.5); font-weight: 600;">
          <span>0%</span>
          <span style="color: ${pctAmortized >= 5 ? '#00e676' : 'rgba(255, 255, 255, 0.4)'};">${pctAmortized >= 5 ? '5% Done ✅' : '5% (~14.000 km)'}</span>
          <span>10% (~27.000 km)</span>
          <span>25% (~67.000 km)</span>
          <span>50%</span>
          <span>100% Free Car!</span>
        </div>
      </div>

      <!-- Section 3: Monthly Loan Offset -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 12px 14px; margin-bottom: 12px;">
        <div style="font-size: 9.5px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; margin-bottom: 8px;">
          Monthly Loan vs Gas Offset
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <div style="flex: 1; background: rgba(255, 82, 82, 0.05); border: 1px solid rgba(255, 82, 82, 0.25); border-radius: 10px; padding: 8px 10px;">
            <div style="font-size: 8.5px; color: rgba(255, 255, 255, 0.45); font-weight: 600;">Bank Payment</div>
            <div style="font-size: 14px; font-weight: 800; color: #ff5252; margin-top: 1px;">-${fmtEur(monthlyLoanPayment)} €</div>
            <div style="font-size: 8px; color: rgba(255, 255, 255, 0.4);">4.95% nominal</div>
          </div>

          <div style="flex: 1; background: rgba(0, 230, 118, 0.06); border: 1px solid rgba(0, 230, 118, 0.2); border-radius: 10px; padding: 8px 10px;">
            <div style="font-size: 8.5px; color: #00e676; font-weight: 600;">Gas Saved / mo</div>
            <div style="font-size: 14px; font-weight: 800; color: #00e676; margin-top: 1px;">+${fmtEur(avgMonthlySavings)} €</div>
            <div style="font-size: 8px; color: rgba(255, 255, 255, 0.4);">~${fmtInt(avgMonthlyKm)} km/mo avg</div>
          </div>

          <div style="flex: 1.1; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 10px; padding: 8px 10px;">
            <div style="font-size: 8.5px; color: #00e5ff; font-weight: 700;">Real Out-of-Pocket</div>
            <div style="font-size: 14px; font-weight: 900; color: #ffffff; margin-top: 1px;">${fmtEur(effectiveMonthlyOutPkt)} €</div>
            <div style="font-size: 8px; color: rgba(255, 255, 255, 0.4);">Net real payment</div>
          </div>
        </div>

        <div style="background: rgba(0, 230, 118, 0.08); border: 1px solid rgba(0, 230, 118, 0.25); border-radius: 8px; padding: 8px 10px; font-size: 9.5px; color: #00e676; font-weight: 700; display: flex; flex-direction: column; gap: 4px;">
          <div>⚡ Gas savings pay ${fmtDec1(avgOffsetPct)}% of your car payment every month</div>
          <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: rgba(255, 255, 255, 0.6); font-weight: 500;">
            <span>This month: ${fmtEur(thisMonthSavings)} € (${fmtInt(monthDistKm)} km)</span>
            <span>Target pace: ~${fmtInt(avgMonthlyKm)} km/mo</span>
          </div>
        </div>
      </div>

      <!-- Section 4: Auto Loan Early Payoff Horizon (Target: New Year 2028) -->
      <div style="background: linear-gradient(135deg, rgba(255, 179, 0, 0.08) 0%, rgba(255, 112, 67, 0.08) 100%); border: 1px solid rgba(255, 179, 0, 0.35); border-radius: 14px; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-size: 9.5px; font-weight: 800; color: #ffd54f; text-transform: uppercase; letter-spacing: 0.4px;">
            🎯 Early Payoff: Jan 2028 (~${monthsToTarget} months)
          </div>
          <div style="font-size: 8.5px; font-weight: 700; color: #ffb74d; background: rgba(255, 179, 0, 0.2); padding: 1px 6px; border-radius: 4px;">
            Pmt ${currentCuotaNum} of 29
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <div style="flex: 1; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 179, 0, 0.25); border-radius: 10px; padding: 8px 10px;">
            <div style="font-size: 8.5px; color: rgba(255, 255, 255, 0.5); font-weight: 600;">Lump Sum to Settle</div>
            <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-top: 1px;">${fmtEur(targetPayoffCapital)} €</div>
            <div style="font-size: 8px; color: rgba(255, 255, 255, 0.4);">Principal balance at Month 29</div>
          </div>

          <div style="flex: 1; background: rgba(0, 230, 118, 0.08); border: 1px solid rgba(0, 230, 118, 0.3); border-radius: 10px; padding: 8px 10px; box-shadow: 0 0 10px rgba(0, 230, 118, 0.1);">
            <div style="font-size: 8.5px; color: #00e676; font-weight: 700;">Interest Kept in Pocket</div>
            <div style="font-size: 15px; font-weight: 900; color: #00e676; margin-top: 1px;">+${fmtEur(interestSavedByEarlyPayoff)} €</div>
            <div style="font-size: 8px; color: rgba(255, 255, 255, 0.4);">Avoided vs full 10-year term</div>
          </div>
        </div>

        <div style="font-size: 9px; color: rgba(255, 255, 255, 0.55); text-align: center;">
          Paying off around New Year 2028 cancels 91 months of bank interest (+${fmtEur(interestSavedByEarlyPayoff)} € saved)!
        </div>
      </div>

    </div>
  `;
    }
  }
  customElements.define('tesla-roi-card', TeslaRoiCard);

  // 6. Unified Mission Control Deck (All-in-one)
  class TeslaMissionControlDeck extends HTMLElement {
    static getStubConfig() {
      return {};
    }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
      this._config = config || {};
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    _render() {
      if (!this._rendered) {
        this.shadowRoot.innerHTML = `
          <style>
            :host { display: block; }
            .deck { display: flex; flex-direction: column; gap: 16px; }
          </style>
          <div class="deck">
            <tesla-cockpit-card id="c-cockpit"></tesla-cockpit-card>
            <tesla-charger-card id="c-charger"></tesla-charger-card>
            <tesla-charging-costs-card id="c-costs"></tesla-charging-costs-card>
            <tesla-savings-card id="c-savings"></tesla-savings-card>
            <tesla-roi-card id="c-roi"></tesla-roi-card>
          </div>
        `;
        this._cockpit = this.shadowRoot.getElementById('c-cockpit');
        this._charger = this.shadowRoot.getElementById('c-charger');
        this._costs = this.shadowRoot.getElementById('c-costs');
        this._savings = this.shadowRoot.getElementById('c-savings');
        this._roi = this.shadowRoot.getElementById('c-roi');

        this._cockpit.setConfig(this._config.cockpit || this._config);
        this._charger.setConfig(this._config.charger || this._config);
        this._costs.setConfig(this._config.costs || this._config);
        this._savings.setConfig(this._config.savings || this._config);
        this._roi.setConfig(this._config.roi || this._config);
        this._rendered = true;
      }
      if (this._hass) {
        this._cockpit.hass = this._hass;
        this._charger.hass = this._hass;
        this._costs.hass = this._hass;
        this._savings.hass = this._hass;
        this._roi.hass = this._hass;
      }
    }
  }
  customElements.define('tesla-mission-control-deck', TeslaMissionControlDeck);

  // Register in HA graphical card picker
  window.customCards = window.customCards || [];
  [
    { type: 'tesla-cockpit-card', name: 'Tesla 2D Cockpit Card', description: 'Interactive Top-Down Vehicle Telemetry, BLE Controls & Tire Pressure' },
    { type: 'tesla-charger-card', name: 'Tesla V2C Charger Card', description: 'V2C Trydan Smart Dynamic EVSE Modulation & Live Controls' },
    { type: 'tesla-charging-costs-card', name: 'Tesla Charging Costs Card', description: 'Charging Session History, Solar Split & Monthly Cost Inspector' },
    { type: 'tesla-savings-card', name: 'Tesla Fuel Savings Card', description: 'MITECO Government Fuel Benchmark & Petrol vs EV Comparison' },
    { type: 'tesla-roi-card', name: 'Tesla ROI & Capital Recovery Card', description: 'Vehicle Payoff Progress & Financing Elimination Calculator' },
    { type: 'tesla-mission-control-deck', name: 'Tesla Mission Control Deck', description: 'Unified Tesla & EV All-In-One Mission Control Deck' }
  ].forEach(card => {
    const idx = window.customCards.findIndex(c => c.type === card.type);
    if (idx >= 0) window.customCards.splice(idx, 1);
    window.customCards.push(card);
  });

  console.info(
    '%c TESLA-CARDS %c v1.0.1 Loaded Successfully ',
    'color: white; background: #e53935; font-weight: bold; border-radius: 4px 0 0 4px;',
    'color: #e53935; background: #0e131a; font-weight: bold; border-radius: 0 4px 4px 0;'
  );
})();
