document.addEventListener('DOMContentLoaded', () => {
    // --- ЭЛЕМЕНТЫ ИНТЕРФЕЙСА ---
    const obsZone = document.getElementById('obs-zone');
    const chromaBtns = document.querySelectorAll('.chroma-btn');
    const customPicker = document.getElementById('custom-chroma-picker');
    const resultValue = document.querySelector('.demo-result-box .value');
    const textColorPicker = document.getElementById('text-color-picker');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const mainDiceGrid = document.getElementById('main-dice-grid');
    const settingsDiceGrid = document.getElementById('settings-dice-grid');
    const addCustomBtn = document.getElementById('add-custom-dice-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const importJsonInput = document.getElementById('import-json-input');
    const modifierInput = document.getElementById('modifier-input');
    const formulaDisplay = document.getElementById('formula-display');
    const breakdownDisplay = document.getElementById('breakdown-display');
    const rollBtn = document.getElementById('roll-btn');
    const clearBtn = document.getElementById('clear-btn');
	const demoResultBox = document.querySelector('.demo-result-box');
	const fadeTimeoutInput = document.getElementById('fade-timeout-input');
	const presetModeBtn = document.getElementById('preset-mode-btn');
	const presetsList = document.getElementById('presets-list');
    // --- СОСТОЯНИЕ ДАЙСОВ ---
    let diceData = {
        4:   { visible: true, custom: false, plus: 0, minus: 0 },
        6:   { visible: true, custom: false, plus: 0, minus: 0 },
        8:   { visible: true, custom: false, plus: 0, minus: 0 },
        10:  { visible: true, custom: false, plus: 0, minus: 0 },
        12:  { visible: true, custom: false, plus: 0, minus: 0 },
        20:  { visible: true, custom: false, plus: 0, minus: 0 },
        100: { visible: true, custom: false, plus: 0, minus: 0 }
    };
    let modifier = 0;
    let isRolling = false;
	let fadeTimer = null;
	let isPresetMode = false;
	let presets = []; 
    // --- ОТКРЫТИЕ / ЗАКРЫТИЕ НАСТРОЕК ---
    openSettingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.remove('hidden');
    });
    closeSettingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.add('hidden');
    });
    // --- НАСТРОЙКИ ЦВЕТОВ ---
    function setChromaColor(color) {
        obsZone.style.backgroundColor = color;
        customPicker.value = color;
        chromaBtns.forEach(btn => {
            if (btn.getAttribute('data-color').toLowerCase() === color.toLowerCase()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    function setTextColor(color) {
        if (resultValue) {
            resultValue.style.color = color;
        }
        textColorPicker.value = color;
    }
    chromaBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-color');
            setChromaColor(color);
        });
    });
    customPicker.addEventListener('input', (e) => {
        setChromaColor(e.target.value);
    });
    textColorPicker.addEventListener('input', (e) => {
        setTextColor(e.target.value);
    });
    // --- ЛОГИКА ЭКСПОРТА И ИМПОРТА JSON ---
    exportJsonBtn.addEventListener('click', () => {
        // Формируем чистый объект только с настройками визуала и структуры кубов
        const cleanDiceConfig = {};
        Object.keys(diceData).forEach(sides => {
            cleanDiceConfig[sides] = {
                visible: diceData[sides].visible,
                custom: diceData[sides].custom
            };
        });
        const config = {
		  bgColor: customPicker.value,
		  textColor: textColorPicker.value,
		  fadeTimeout: fadeTimeoutInput.value,
		  dice: cleanDiceConfig,
		  presets: presets
		};
        const jsonString = JSON.stringify(config, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
		link.download = 'obs_dice_settings.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
    importJsonBtn.addEventListener('click', () => {
        importJsonInput.click();
    });
    importJsonInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
				if (config.presets && Array.isArray(config.presets)) {
				  presets = config.presets;
				  renderPresets();
				}
                const config = JSON.parse(event.target.result);
                if (config.bgColor) {
                    setChromaColor(config.bgColor);
                }
                if (config.textColor) {
                    setTextColor(config.textColor);
                }
				if (config.fadeTimeout !== undefined) {
				  fadeTimeoutInput.value = config.fadeTimeout;
				}
                if (config.dice && typeof config.dice === 'object') {
                    const newDiceData = {};
                    Object.keys(config.dice).forEach(sides => {
                        const s = parseInt(sides);
                        if (!isNaN(s)) {
                            newDiceData[s] = {
                                visible: !!config.dice[sides].visible,
                                custom: !!config.dice[sides].custom,
                                plus: 0,
                                minus: 0
                            };
                        }
                    });
                    if (Object.keys(newDiceData).length > 0) {
                        diceData = newDiceData;
                    }
                }
                renderSettingsDiceGrid();
                renderMainDiceGrid();
                alert('Настройки успешно импортированы!');
            } catch (err) {
                alert('Ошибка при чтении файла JSON. Убедитесь, что файл содержит корректные данные.');
            }
        };
        reader.readAsText(file);
        importJsonInput.value = ''; // Сброс инпута для повторного выбора того же файла
    });
    // --- ЛОГИКА И ВЫВОД ФОРМУЛЫ ---
    function updateFormula() {
        const parts = [];
        const sortedSides = Object.keys(diceData).map(Number).sort((a, b) => a - b);
        sortedSides.forEach(sides => {
            const data = diceData[sides];
            if (data.visible && data.plus > 0) {
                parts.push(`${data.plus}к${sides}`);
            }
        });
        sortedSides.forEach(sides => {
            const data = diceData[sides];
            if (data.visible && data.minus > 0) {
                parts.push(`- ${data.minus}к${sides}`);
            }
        });
        let formulaText = parts.join(' + ').replace(/\+ - /g, '- ');
        if (modifier !== 0) {
            if (parts.length > 0) {
                formulaText += modifier > 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`;
            } else {
                formulaText = `${modifier}`;
            }
        }
        if (parts.length === 0 && modifier === 0) {
            formulaDisplay.textContent = 'Выберите кубики...';
            formulaDisplay.style.color = '#7c7c8a';
            rollBtn.disabled = true;
        } else {
            formulaDisplay.textContent = formulaText;
            formulaDisplay.style.color = '#f1f1f1';
            rollBtn.disabled = false;
        }
    }
    function updateBadge(sides) {
        const badge = document.getElementById(`count-k${sides}`);
        if (badge && diceData[sides]) {
            const { plus, minus } = diceData[sides];
            if (plus === 0 && minus === 0) {
                badge.textContent = '0';
                badge.style.backgroundColor = '#8257e5';
                badge.style.color = '#ffffff';
            } else if (minus === 0) {
                badge.textContent = `+${plus}`;
                badge.style.backgroundColor = '#50fa7b';
                badge.style.color = '#000000';
            } else if (plus === 0) {
                badge.textContent = `-${minus}`;
                badge.style.backgroundColor = '#ff5555';
                badge.style.color = '#ffffff';
            } else {
				badge.textContent = `+${plus}/-${minus}`;
                badge.style.backgroundColor = '#ffb86c';
                badge.style.color = '#000000';
            }
        }
    }
    // --- РЕНДЕР ИНТЕРФЕЙСА ---
    function renderMainDiceGrid() {
        const modTile = mainDiceGrid.querySelector('.mod-tile');
        mainDiceGrid.innerHTML = '';
        mainDiceGrid.appendChild(modTile);
        const sortedSides = Object.keys(diceData).map(Number).sort((a, b) => a - b);
        sortedSides.forEach(sides => {
            if (diceData[sides].visible) {
                const btn = document.createElement('button');
                btn.className = 'dice-btn';
                btn.setAttribute('data-sides', sides);
                btn.setAttribute('oncontextmenu', 'return false;');
                btn.innerHTML = `к${sides} <span class="badge" id="count-k${sides}">0</span>`;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (e.shiftKey) {
                        diceData[sides].minus++;
                    } else {
                        diceData[sides].plus++;
                    }
                    updateBadge(sides);
                    updateFormula();
                });
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (diceData[sides].minus > 0) {
                        diceData[sides].minus--;
                    } else if (diceData[sides].plus > 0) {
                        diceData[sides].plus--;
                    }
                    updateBadge(sides);
                    updateFormula();
                });
                mainDiceGrid.appendChild(btn);
                updateBadge(sides);
            }
        });
        updateFormula();
    }
    function renderSettingsDiceGrid() {
        settingsDiceGrid.innerHTML = '';
        const sortedSides = Object.keys(diceData).map(Number).sort((a, b) => a - b);
        sortedSides.forEach(sides => {
            const isVisible = diceData[sides].visible;
            const isCustom = diceData[sides].custom;
            const btn = document.createElement('button');
            btn.className = `setting-dice-btn ${isVisible ? 'active' : ''}`;
            btn.setAttribute('oncontextmenu', 'return false;');
            btn.innerHTML = `к${sides}`;
            if (isCustom) {
                const delTag = document.createElement('span');
                delTag.className = 'del-tag';
                delTag.innerHTML = '✕';
                delTag.title = 'Удалить куб';
                delTag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    delete diceData[sides];
                    renderSettingsDiceGrid();
                    renderMainDiceGrid();
                });
                btn.appendChild(delTag);
            }
            btn.addEventListener('click', () => {
                diceData[sides].visible = !diceData[sides].visible;
                if (!diceData[sides].visible) {
                    diceData[sides].plus = 0;
                    diceData[sides].minus = 0;
                }
                renderSettingsDiceGrid();
                renderMainDiceGrid();
            });
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (isCustom) {
                    delete diceData[sides];
                    renderSettingsDiceGrid();
                    renderMainDiceGrid();
                }
            });
            settingsDiceGrid.appendChild(btn);
        });
    }
    addCustomBtn.addEventListener('click', () => {
        const input = prompt('Введите количество граней нового куба:');
        const sides = parseInt(input);
        if (sides && sides > 0) {
            if (diceData[sides]) {
                alert(`Куб к${sides} уже существует!`);
                return;
            }
            diceData[sides] = {
                visible: true,
				custom: true,
                plus: 0,
                minus: 0
            };
            renderSettingsDiceGrid();
            renderMainDiceGrid();
        } else if (input !== null) {
            alert('Пожалуйста, введите корректное положительное число.');
        }
    });
    modifierInput.addEventListener('input', (e) => {
        modifier = parseInt(e.target.value) || 0;
        updateFormula();
    });
    clearBtn.addEventListener('click', () => {
		togglePresetMode(false);
        Object.keys(diceData).forEach(sides => {
            diceData[sides].plus = 0;
            diceData[sides].minus = 0;
            updateBadge(sides);
        });
        modifier = 0;
        modifierInput.value = 0;
        breakdownDisplay.textContent = '';
        updateFormula();
    });
	// --- ЛОГИКА ПРЕСЕТОВ ---
	// Включение / выключение режима пресета
	function togglePresetMode(enable) {
	  isPresetMode = enable !== undefined ? enable : !isPresetMode;
	  if (isPresetMode) {
		presetModeBtn.classList.add('active');
		rollBtn.textContent = 'СОХРАНИТЬ';
		rollBtn.style.backgroundColor = '#50fa7b';
		rollBtn.style.color = '#000000';
	  } else {
		presetModeBtn.classList.remove('active');
		rollBtn.textContent = 'РОЛЛ';
		rollBtn.style.backgroundColor = '#8257e5';
		rollBtn.style.color = '#ffffff';
	  }
	}
	presetModeBtn.addEventListener('click', () => {
	  togglePresetMode();
	});
	// Рендер списка пресетов
	function renderPresets() {
	  presetsList.innerHTML = '';
	  presets.forEach((preset, index) => {
		const card = document.createElement('div');
		card.className = 'preset-card';
		// Формируем текст формулы для показа под именем
		const parts = [];
		Object.keys(preset.dice).forEach(sides => {
		  const { plus, minus } = preset.dice[sides];
		  if (plus > 0) parts.push(`+${plus}к${sides}`);
		  if (minus > 0) parts.push(`-${minus}к${sides}`);
		});
		if (preset.modifier !== 0) {
		  parts.push(preset.modifier > 0 ? `+${preset.modifier}` : `${preset.modifier}`);
		}
		const formulaText = parts.join(' ');
		card.innerHTML = `<div class="preset-info">
			<span class="preset-name">${preset.name}</span>
			<span class="preset-formula">${formulaText}</span>
		  </div>
		  <button class="preset-del-btn" title="Удалить пресет">🗑</button>`;
		// Клик по пресету — быстрый бросок
		card.addEventListener('click', (e) => {
		  if (e.target.classList.contains('preset-del-btn')) return;
		  executePresetRoll(preset);
		});
		// Удаление пресета
		const delBtn = card.querySelector('.preset-del-btn');
		delBtn.addEventListener('click', (e) => {
		  e.stopPropagation();
		  presets.splice(index, 1);
		  renderPresets();
		});
		presetsList.appendChild(card);
	  });
	}
	// Быстрый бросок по пресету
	function executePresetRoll(preset) {
	  // Загружаем значения из пресета во временные данные
	  Object.keys(diceData).forEach(sides => {
		diceData[sides].plus = preset.dice[sides]?.plus || 0;
		diceData[sides].minus = preset.dice[sides]?.minus || 0;
		updateBadge(sides);
	  });
	  modifier = preset.modifier;
	  modifierInput.value = modifier;
	  updateFormula();
	  // Запускаем стандартный бросок
	  rollBtn.click();
	}
    // --- БРОСОК С АНИМАЦИЕЙ И ДЕТАЛИЗАЦИЕЙ ---
    rollBtn.addEventListener('click', () => {
		if (isPresetMode) {
		const presetName = prompt('Введите название пресета:');
		if (presetName && presetName.trim() !== '') {
		  // Клонируем кубики для пресета
		  const presetDice = {};
		  Object.keys(diceData).forEach(sides => {
			if (diceData[sides].plus > 0 || diceData[sides].minus > 0) {
			  presetDice[sides] = {
				plus: diceData[sides].plus,
				minus: diceData[sides].minus
			  };
			}
		  });
		  presets.push({
			id: Date.now(),
			name: presetName.trim(),
			dice: presetDice,
			modifier: modifier
		  });
		  renderPresets();
		  togglePresetMode(false); // Выходим из режима пресета
		}
		return; // Не выполняем сам бросок
	  }
        if (isRolling) return;
		  if (fadeTimer) {
			clearTimeout(fadeTimer);
			fadeTimer = null;
		  }
		  demoResultBox.classList.remove('hidden-fade');
        isRolling = true;
        rollBtn.disabled = true;
        breakdownDisplay.textContent = '';
        let finalTotal = 0;
        let minPossible = 0;
        let maxPossible = 0;
        const breakdownParts = [];
        const sortedSides = Object.keys(diceData).map(Number).sort((a, b) => a - b);
        sortedSides.forEach(sides => {
            const data = diceData[sides];
            if (data.visible) {
                if (data.plus > 0) {
                    const rolls = [];
                    for (let i = 0; i < data.plus; i++) {
                        const roll = Math.floor(Math.random() * sides) + 1;
                        rolls.push(roll);
                        finalTotal += roll;
                        minPossible += 1;
                        maxPossible += sides;
                    }
                    breakdownParts.push(`[${data.plus}к${sides}: ${rolls.join(', ')}]`);
                }
                if (data.minus > 0) {
                    const rolls = [];
                    for (let i = 0; i < data.minus; i++) {
                        const roll = Math.floor(Math.random() * sides) + 1;
                        rolls.push(roll);
                        finalTotal -= roll;
                        minPossible -= sides;
                        maxPossible -= 1;
                    }
                    breakdownParts.push(`- [${data.minus}к${sides}: ${rolls.join(', ')}]`);
                }
            }
        });
        let breakdownText = breakdownParts.join(' + ').replace(/\+ - /g, '- ');
        if (modifier !== 0) {
            if (breakdownParts.length > 0) {
                breakdownText += modifier > 0 ? `+ ${modifier}` : - `${Math.abs(modifier)}`;
            } else {
                breakdownText = `${modifier}`;
            }
        }
        finalTotal += modifier;
        minPossible += modifier;
        maxPossible += modifier;
        const duration = 700;
        const frameInterval = 40;
        const startTime = Date.now();
        resultValue.classList.remove('pop');
        resultValue.classList.add('rolling');
        const rollInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < duration) {
                const randomFakeResult = Math.floor(Math.random() * (maxPossible - minPossible + 1)) + minPossible;
                resultValue.textContent = randomFakeResult;
            } else {
                clearInterval(rollInterval);
                resultValue.textContent = finalTotal;
                resultValue.classList.remove('rolling');
                resultValue.classList.add('pop');
                breakdownDisplay.textContent = breakdownText;
                isRolling = false;
                rollBtn.disabled = false;
				const seconds = parseFloat(fadeTimeoutInput.value);
				if (!isNaN(seconds) && seconds > 0) {
				  fadeTimer = setTimeout(() => {
					demoResultBox.classList.add('hidden-fade');
				  }, seconds * 1000);
				}
			  }
			}, frameInterval);
    });
    renderMainDiceGrid();
    renderSettingsDiceGrid();
});



