import type HighlightrPlugin from "../main";
import {
	App,
	Setting,
	PluginSettingTab,
	Notice,
	TextComponent,
	ColorComponent,
} from "obsidian";
import { HIGHLIGHTER_METHODS, HIGHLIGHTER_STYLES } from "./settings-data";
import { numToHexSuffix, sample } from "src/utils";

export class HighlightrSettingTab extends PluginSettingTab {
	plugin: HighlightrPlugin;
	appendMethod: string;

	constructor(app: App, plugin: HighlightrPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h1", { text: "Painter" });
		const authorP = containerEl.createEl('p')
		authorP.createEl("span", { text: "Initially created by " })
		authorP.createEl('a', { text: 'Chetachi 👩🏽‍💻', href: 'https://github.com/chetachiezikeuzor', })
		authorP.createEl('span', { text: '. Rewritten & extended by ' })
		authorP.createEl('a', { text: 'KraXen72 🧉', href: 'https://github.com/KraXen72' })
		authorP.createEl('span', { text: '.' })
		containerEl.createEl("h2", { text: "Plugin Settings" });

		new Setting(containerEl)
			.setName("Choose highlight method")
			.setDesc(
				`Choose between highlighting with inline CSS or CSS classes. Please note that there are pros and cons to both choices. Inline CSS will keep you from being reliant on external CSS files if you choose to export your notes. CSS classes are more flexible and easier to customize.`
			)
			.addDropdown((dropdown) => {
				let methods: Record<string, string> = {};
				HIGHLIGHTER_METHODS.map((method) => (methods[method] = method));
				dropdown.addOptions(methods);
				dropdown
					.setValue(this.plugin.settings.highlighterMethods)
					.onChange((highlightrMethod) => {
						this.plugin.settings.highlighterMethods = highlightrMethod;
						setTimeout(() => {
							dispatchEvent(new Event("Highlightr-NewCommand"));
						}, 100);
						this.plugin.saveSettings();
						this.plugin.saveData(this.plugin.settings);
						this.display();
					});
			});

		const stylesSetting = new Setting(containerEl);

		stylesSetting
			.setName("Choose highlight style")
			.setClass('painter-plugin-setting-item-pick-hl')
			.setDesc(
				`Depending on your design aesthetic, you may want to customize the style of your highlights. Choose from an assortment of different highlighter styles by using the dropdown. Depending on your theme, this plugin's CSS may be overriden.`
			)
			.addDropdown((dropdown) => {
				let styles: Record<string, string> = {};
				HIGHLIGHTER_STYLES.map((style) => (styles[style] = style));
				dropdown.addOptions(styles);
				dropdown
					.setValue(this.plugin.settings.highlighterStyle)
					.onChange((highlighterStyle) => {
						this.plugin.settings.highlighterStyle = highlighterStyle;
						this.plugin.saveSettings();
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});

		const styleDemo = () => {
			let html = ''
			if (this.plugin.settings.orderedColors.length === 0) {
				return '<em>Add atleast 1 color to showcase different styles</em>'
			} else {
				const col = sample(this.plugin.settings.orderedColors);
				for (const st of HIGHLIGHTER_STYLES) {
					html += `<div class="highlightr-${st}"><mark class="hltr-${col} style-demo">${st}</mark></div>`
				}
			}
			return html;
		};

		let styleDemoEl = createEl("p");
		styleDemoEl.addClass('painter-plugin-style-demo');
		styleDemoEl.innerHTML = styleDemo()
		const reRollBtn = createEl('button', { text: 'try different color' })
		reRollBtn.addEventListener('click', () => { styleDemoEl.innerHTML = styleDemo() });
		stylesSetting.infoEl.appendChild(styleDemoEl);
		stylesSetting.infoEl.appendChild(reRollBtn)

		const highlighterSetting = new Setting(containerEl);

		highlighterSetting
			.setName("Choose highlight colors")
			.setClass("painter-plugin-setting-item-pick-col")
			.setDesc(
				`Create new highlight colors by providing a color name and using the color picker to set the hex code value. Don't forget to save the color before exiting the color picker. Drag and drop the highlight color to change the order for your highlighter component.`
			);

		const colorNameInput = new TextComponent(highlighterSetting.controlEl);
		colorNameInput.setPlaceholder("Color name");
		colorNameInput.inputEl.addClass("painter-plugin-settings-color");

		const colorValueInput = new TextComponent(highlighterSetting.controlEl)
			.setPlaceholder("Color HEX: Click off color picker to update");
		colorValueInput.inputEl.addClass("painter-plugin-settings-value");
		colorValueInput.inputEl.setCssStyles({ width: '5rem' })

		const colorAlphaInput = new TextComponent(highlighterSetting.controlEl)
			.setPlaceholder("Alpha");
		colorAlphaInput.inputEl.setCssStyles({ width: '2.75rem' })
		colorAlphaInput.setValue('ff')

		let colPreviewEl: HTMLDivElement | null = null;
		const updateColPreview = () => {
			if (colPreviewEl === null) return;
			let hex = colorValueInput.getValue() || "#ffffff"
			if (!hex.startsWith('#')) hex = "#" + hex
			if (hex.length > 7) hex = hex.slice(0, 8)
			let alpha = colorAlphaInput.getValue() || "ff"
			if (alpha.length > 2) alpha = alpha.slice(0, 3)
			let res = hex + alpha
			colPreviewEl.style.backgroundColor = res
		}

		highlighterSetting
			.addColorPicker((picker: ColorComponent & { colorPickerEl: HTMLInputElement }) => {
				picker.setValue('#CCA9FF')
				picker.colorPickerEl.addEventListener('input', (e) => {
					if (e.target === null) return;
					const et = e.target as HTMLInputElement
					colorValueInput.setValue(et.value)
					updateColPreview()
				})
			})
			.addSlider(slider => {
				slider.setLimits(0, 100, 1)
				slider.setValue(255)
				slider.sliderEl.title = 'Alpha / opacity'
				slider.onChange(val => {
					slider.showTooltip()
					const val255 = Math.round((val / 100) * 255)
					colorAlphaInput.setValue(numToHexSuffix(val255))
					updateColPreview()
				})
			})
			.addButton(button => {
				button.setClass('painter-plugin-color-preview')
				colPreviewEl = button.buttonEl.createDiv('div')
				colPreviewEl.addClass('painter-plugin-color-preview2')
			})
			.addButton(button => {
				button
					.setClass("painter-plugin-settings-button")
					.setClass("painter-plugin-settings-button-add")
					.setIcon("save")
					.setTooltip("Save")
					.onClick(async (buttonEl: any) => {
						let color = colorNameInput.inputEl.value.replace(" ", "-");
						let value = colorValueInput.inputEl.value;

						if (color && value) {
							if (!this.plugin.settings.orderedColors.includes(color)) {
								this.plugin.settings.orderedColors.push(color);
								this.plugin.settings.highlighters[color] = value;
								setTimeout(() => {
									dispatchEvent(new Event("Highlightr-NewCommand"));
								}, 100);
								await this.plugin.saveSettings();
								this.display();
							} else {
								buttonEl.stopImmediatePropagation();
								new Notice("This color already exists");
							}
						}
						color && !value
							? new Notice("Highlighter hex code missing")
							: !color && value
								? new Notice("Highlighter name missing")
								: new Notice("Highlighter values missing"); // else
					});
			})

		const highlightersContainer = containerEl.createEl("div", {
			cls: "HighlightrSettingsTabsContainer",
		});

		const reorderColor = (oldIndex: number, newIndex: number) => {
			if (newIndex < 0) return;
			const arrayResult = this.plugin.settings.orderedColors;
			const [removed] = arrayResult.splice(oldIndex, 1);
			arrayResult.splice(newIndex, 0, removed);
			this.plugin.settings.orderedColors = arrayResult;
			this.plugin.saveSettings();
		}

		this.plugin.settings.orderedColors.forEach((highlighter, index, arr) => {
			const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill=${this.plugin.settings.highlighters[highlighter]} stroke=${this.plugin.settings.highlighters[highlighter]} stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408-.006L7.096 10.82a1.01 1.01 0 0 0-.273.488l-1.024 4.437L4 18h2.828l1.142-1.129l3.588-.828c.18-.042.345-.133.477-.262l8.667-8.535a1 1 0 0 0 .005-1.42zm-9.369 7.833l-2.121-2.12l7.243-7.131l2.12 2.12l-7.242 7.131zM4 20h16v2H4z"/></svg>`;
			const settingItem = highlightersContainer.createEl("div");
			settingItem.addClass("painter-plugin-item-color");
			const colorIcon = settingItem.createEl("span");
			colorIcon.addClass("painter-plugin-setting-icon");
			colorIcon.innerHTML = icon;

			new Setting(settingItem)
				.setClass("highlighter-setting-item")
				.setName(highlighter)
				.setDesc(this.plugin.settings.highlighters[highlighter])
				.addButton(button => {
					button
						.setClass("painter-plugin-settings-button")
						.setTooltip("Move up")
						.setIcon("chevron-up")
						.onClick(() => {
							reorderColor(index, index - 1)
							this.display();
						})
					if (index === 0) button.setDisabled(true)
				})
				.addButton(button => {
					button
						.setClass("painter-plugin-settings-button")
						.setTooltip("Move down")
						.setIcon("chevron-down")
						.onClick(() => {
							reorderColor(index, index + 1)
							this.display();
						})
					if (index === arr.length - 1) button.setDisabled(true)
				})
				.addButton((button) => {
					button
						.setClass("painter-plugin-settings-button")
						.setClass("painter-plugin-settings-button-delete")
						.setIcon("trash-2")
						.setTooltip("Remove")
						.onClick(async () => {
							new Notice(`${highlighter} highlight deleted`);
							(this.app as any).commands.removeCommand(
								`highlightr-plugin:${highlighter}`
							);
							delete this.plugin.settings.highlighters[highlighter];
							this.plugin.settings.orderedColors.remove(highlighter);
							setTimeout(() => {
								dispatchEvent(new Event("Highlightr-NewCommand"));
							}, 100);
							await this.plugin.saveSettings();
							this.display();
						});
				})

			const a = createEl("a");
			a.setAttribute("href", "");
		});
	}
}
