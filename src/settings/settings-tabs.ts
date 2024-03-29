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
import { customHLIcon } from "src/custom-icons";

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
			.setName('Menu Mode')
			.setDesc(`Set the menu style - 'minimal' shows icons only in one line`)
			.addDropdown(dropdown => {
				dropdown.addOptions({ minimal: 'minimal', normal: 'normal' });
				dropdown
					.setValue(this.plugin.settings.menuMode)
					.onChange((newMode) => {
						this.plugin.settings.menuMode = newMode as 'minimal' | 'normal';
						this.plugin.saveSettings();
						this.plugin.saveData(this.plugin.settings);
						this.plugin.refresh();
					});
			});

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
							dispatchEvent(new Event("painter:refreshstyles"));
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
			const frag = new DocumentFragment()
			if (this.plugin.settings.orderedColors.length === 0) {
				frag.appendChild(createEl('em', { text: 'Add atleast 1 color to showcase different styles' }))
			} else {
				const col = sample(this.plugin.settings.orderedColors);
				for (const st of HIGHLIGHTER_STYLES) {
					frag.createDiv({ cls: `highlightr-${st}` }).createEl('mark', { cls: [`hltr-${col}`, 'style-demo'], text: st })
				}
			}
			return frag
		};

		let styleDemoEl = createEl("p", { cls: 'painter-plugin-style-demo' });
		styleDemoEl.appendChild(styleDemo())
		const reRollBtn = createEl('button', { text: 'try different color' })
		reRollBtn.addEventListener('click', () => { 
			styleDemoEl.textContent = ''
			styleDemoEl.appendChild(styleDemo())
		});
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

		const defaultColor = "#cca9ff"
		let colPreviewEl: HTMLDivElement | null = null;

		const combinedColor = () => {
			let hex = colorValueInput.getValue() || defaultColor;
			if (!hex.startsWith('#')) hex = "#" + hex
			if (hex.length > 7) hex = hex.slice(0, 8)
			let alpha = colorAlphaInput.getValue() || "ff"
			if (alpha.length > 2) alpha = alpha.slice(0, 3)
			return hex + alpha
		}

		const updateColPreview = () => {
			if (colPreviewEl === null) return;
			colPreviewEl.style.backgroundColor = combinedColor()
		}

		highlighterSetting
			.addColorPicker((picker: ColorComponent & { colorPickerEl: HTMLInputElement }) => {
				picker.setValue(defaultColor)
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
					.onClick(async () => {
						let colorName = colorNameInput.getValue().replace(" ", "-");
						let colorValue = colorValueInput.getValue();

						if (!colorName) { new Notice("Painter: HEX code missing"); return; }
						if (!colorAlphaInput) { new Notice("Painter: Alpha value missing"); return; }
						if (!colorValue) { new Notice("Painter: Color name missing"); return; }
						if (this.plugin.settings.orderedColors.includes(colorName)) { 
							new Notice("Painter: Color already exists"); 
							return; 
						}

						this.plugin.settings.orderedColors.push(colorName);
						this.plugin.settings.highlighters[colorName] = combinedColor();
						await this.plugin.saveSettings();
						this.display();

						dispatchEvent(new Event("painter:refreshstyles"));
					});
			})

		updateColPreview()
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
			const settingItem = highlightersContainer.createEl("div");
			settingItem.addClass("painter-plugin-item-color");
			const colorIcon = settingItem.createEl("span", { cls: "painter-plugin-setting-icon" });
			colorIcon.appendChild(customHLIcon(this.plugin.settings.highlighters[highlighter]));

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
				// .addButton(button => {
				// 	button
				// 		.setClass('painter-plugin-settings-button')
				// 		.setClass('painter-plugin-settings-button-edit')
				// 		.setTooltip('edit')
				// 		.setIcon('wrench')
				// 		.onClick( () => {

				// 		})
				// })
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
								dispatchEvent(new Event("painter:refreshstyles"));
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
