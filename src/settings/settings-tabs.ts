import type Painter from "../main";
import {
	App,
	Setting,
	PluginSettingTab,
	Notice,
	TextComponent,
	ColorComponent,
	setIcon,
	SliderComponent,
	ButtonComponent,
} from "obsidian";
import { HIGHLIGHTER_METHODS, HIGHLIGHTER_STYLES } from "./settings-data";
import { hexSuffixToNum, numToHexSuffix, sample } from "src/utils";
import { customHLIcon } from "src/custom-icons";
import Sortable from 'sortablejs';

export class PainterSettingTab extends PluginSettingTab {
	plugin: Painter;
	appendMethod: string;

	constructor(app: App, plugin: Painter) {
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
			if (this.plugin.settings.highlighterOrder.length === 0) {
				frag.appendChild(createEl('em', { text: 'Add atleast 1 color to showcase different styles' }))
			} else {
				const col = sample(this.plugin.settings.highlighterOrder);
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

		const addColorSetting = new Setting(containerEl);

		addColorSetting
			.setName("Choose highlight colors")
			.setClass("painter-plugin-setting-item-pick-col")
			.setDesc(
				`Create new highlight colors by providing a color name and using the color picker to set the hex code value. Don't forget to save the color before exiting the color picker. Drag and drop the highlight color to change the order for your highlighter component.`
			);
		const defaultColor = "#cca9ff"
		let colPreviewEl: HTMLDivElement | null = null;

		const updateColPreview = () => {
			if (colPreviewEl === null) return;
			colPreviewEl.style.backgroundColor = combinedColor()
		}

		const colorNameInput = new TextComponent(addColorSetting.controlEl);
		colorNameInput.setPlaceholder("Color name");
		colorNameInput.inputEl.addClass("painter-plugin-settings-color");

		const colorValueInput = new TextComponent(addColorSetting.controlEl)
			.setPlaceholder("Color HEX: Click off color picker to update");
		colorValueInput.inputEl.addClass("painter-plugin-settings-value");
		colorValueInput.inputEl.setCssStyles({ width: '5rem' })

		const colorAlphaInput = new TextComponent(addColorSetting.controlEl)
			.setPlaceholder("Alpha");
		colorAlphaInput.inputEl.setCssStyles({ width: '2.75rem' })
		colorAlphaInput.setValue('ff')

		const colorPicker = new ColorComponent(addColorSetting.controlEl) as ColorComponent & { colorPickerEl: HTMLInputElement }
		colorPicker.setValue(defaultColor)
		colorPicker.colorPickerEl.addEventListener('input', (e) => {
			if (e.target == null && e.currentTarget == null) return;
			const et = (e.target || e.currentTarget) as HTMLInputElement
			colorValueInput.setValue(et.value)
			updateColPreview()
		})

		const alphaSlider = new SliderComponent(addColorSetting.controlEl)
		alphaSlider.setLimits(0, 100, 1)
		alphaSlider.setValue(255)
		alphaSlider.sliderEl.title = 'Alpha / opacity'
		alphaSlider.sliderEl.addEventListener('input', (e) => {
			if (e.target == null && e.currentTarget == null) return;
			const et = (e.target || e.currentTarget) as HTMLInputElement

			alphaSlider.showTooltip()
			const val255 = Math.round((et.valueAsNumber / 100) * 255)
			colorAlphaInput.setValue(numToHexSuffix(val255))
			updateColPreview()
		})

		const colPreviewWrap = addColorSetting.controlEl.createDiv({ cls: 'painter-plugin-color-preview' })
		colPreviewEl = colPreviewWrap.createDiv({ cls: 'painter-plugin-color-preview2' })
		
		new ButtonComponent(addColorSetting.controlEl)
			.setClass("painter-plugin-settings-button")
			.setClass("painter-plugin-settings-button-add")
			.setIcon("save")
			.setTooltip("Save")
			.onClick(async () => {
				let colorName = colorNameInput.getValue().replace(" ", "-");
				let colorValue = colorValueInput.getValue();

				if (colorName.length > 50) colorName = colorName.slice(0, 51)
				if (!colorName) { new Notice("Painter: Color name missing"); return; }
				if (!colorValue) { new Notice("Painter: HEX code missing"); return; }
				if (!colorAlphaInput) { new Notice("Painter: Alpha value missing"); return; }
				if (this.plugin.settings.highlighterOrder.includes(colorName)) { 
					new Notice(`Painter: Color '${colorName}' already exists`); 
					return; 
				}

				this.plugin.settings.highlighterOrder.push(colorName);
				this.plugin.settings.highlighters[colorName] = combinedColor();
				await this.plugin.saveSettings();
				this.display();

				dispatchEvent(new Event("painter:refreshstyles"));
			});


		const combinedColor = () => {
			let hex = colorValueInput.getValue() || defaultColor;
			if (!hex.startsWith('#')) hex = "#" + hex
			if (hex.length > 7) hex = hex.slice(0, 8)
			let alpha = colorAlphaInput.getValue() || ""
			if (alpha.length > 2) alpha = alpha.slice(0, 3)
			return hex + alpha
		}

		// two-way binding
		colorValueInput.inputEl.addEventListener('input', (e) => { 
			if (e.target == null && e.currentTarget == null) return;
			colorPicker.setValue(((e.target || e.currentTarget) as HTMLInputElement)?.value)
			updateColPreview()
		})
		colorAlphaInput.inputEl.addEventListener('input', (e) => {
			if (e.target == null && e.currentTarget == null) return;
			const val = ((e.target || e.currentTarget) as HTMLInputElement).value
			alphaSlider.setValue(Math.round((hexSuffixToNum(val) / 255) * 100))
			updateColPreview()
		})

		updateColPreview()
		const highlightersContainer = containerEl.createEl("div", {
			attr: { id: "painter-plugin-sortable-group" },
		});

		this.plugin.settings.highlighterOrder.forEach((highlighter, index, arr) => {
			const settingItem = highlightersContainer.createEl("div", { cls: "painter-plugin-item-color" });
			const handle = settingItem.createDiv({ cls: "painter-plugin-setting-handle" })
			setIcon(handle, 'grip-vertical')
			const colorIcon = settingItem.createEl("span", { cls: "painter-plugin-setting-icon" });
			colorIcon.appendChild(customHLIcon(this.plugin.settings.highlighters[highlighter]));

			new Setting(settingItem)
				.setClass("painter-plugin-color-setting-item")
				.setName(highlighter)
				.setDesc(this.plugin.settings.highlighters[highlighter])
				.addButton(button => {
					button
						.setClass('painter-plugin-settings-button')
						.setClass('painter-plugin-settings-button-edit')
						.setTooltip('edit')
						.setIcon('wrench')
						.onClick(() => {
							const colorVal = this.plugin.settings.highlighters[highlighter]
							colorNameInput.setValue(highlighter)
							colorValueInput.setValue(colorVal.slice(0,7))
							colorAlphaInput.setValue(colorVal.slice(7, 9) || 'ff')
						})
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
							this.plugin.settings.highlighterOrder.remove(highlighter);
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

		const sort = new Sortable(highlightersContainer, {
			group: 'shared',
			animation: 150,
			handle: '.painter-plugin-setting-handle',
			ghostClass: 'painter-plugin-ghost',
			onSort: ({ oldIndex, newIndex }) => {
				if (typeof oldIndex === "undefined" || typeof newIndex === "undefined") return;
        const [removed] = this.plugin.settings.highlighterOrder.splice(oldIndex, 1);
				this.plugin.settings.highlighterOrder.splice(newIndex, 0, removed)
        this.plugin.saveSettings();
      },
		})
	}
}
