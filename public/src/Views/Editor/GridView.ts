import { BitmapFont, BitmapText, Container, Graphics } from "pixi.js";
import { MAX_DURATION_SEC, RATIO_MILLS_BY_PX, RATIO_MILLS_BY_PX_FOR_120_BPM, ZOOM_LEVEL } from "../../Env";
import EditorView from "./EditorView";

BitmapFont.from("GridViewFont", {
  fontFamily: "Arial",
  fontSize: 12,
  strokeThickness: 2,
  fill: "white"
});

export default class GridView extends Container {
  /**
   * The main editor of the application.
   */
  private _editorView: EditorView;
  /**
   * PIXI.Graphics that represent the grid of bars.
   */
  public grid: Graphics;
  private listOfTextElements: BitmapText[] = [];
  private nbStepsPerBar: number = 4;
  private stepNote: number = 4;
  private bpm:number = 120;
  // useful for snapping in EditorView
  public cellSize:number = 100;

  constructor(editor: EditorView) {
    super();
    this._editorView = editor;

    this._editorView.viewport.addChild(this);

    this.zIndex = 99;

    this.grid= new Graphics();
    this.addChild(this.grid);
    this.draw();
  }

  updateTimeSignature(nbStepsPerBar:number, stepNote:number) {
    this.nbStepsPerBar = nbStepsPerBar;
    this.stepNote = stepNote;
    this.updateGrid();
  }

  
  private draw(): void {
    // get width of editorView

    const width = (MAX_DURATION_SEC * 1000) / RATIO_MILLS_BY_PX; //this._editorView.viewport.width;
    const height = this._editorView.viewport.height;

    // using a for loop, draw vertical lines, from x = 0 to x=width, step = 100 pixels
    this.grid.lineStyle(1, "red", 0.2);
    
    // number of steps in bar
    // Should be taken from the rythm key signature element when it will be available
    let nbSteps = this.nbStepsPerBar;

    // MB test. Just compute width of grid for tempo = 120, adjust by multiplying by zoom level.
    // For 4/4 time signature, 4 steps per bar, 4 beats per bar, 1 beat per step
    let barWidth = (2000/RATIO_MILLS_BY_PX_FOR_120_BPM) * ZOOM_LEVEL * 4 / this.stepNote
    let stepWidth = barWidth / 4
    this.cellSize = stepWidth

    // if time signature has more steps per bar, then we need to adjust the width of the bar
    // accordingly
    barWidth = stepWidth * nbSteps

    let displaySteps = true
    if (stepWidth < 10) displaySteps = false

    // number of pixels per bar
    //const barWidth = nbSteps * stepWidth;
    let displayBarsEvery = 1
    if (barWidth < 20) {
      // display only one bar out of 2
      displayBarsEvery = 2
      this.cellSize = stepWidth * 2
    }
    if (barWidth < 10) {
      // display only one bar out of 4
      displayBarsEvery = 4
      this.cellSize = stepWidth * 4
    }
    if (barWidth < 6) {
      // display only one bar out of 4
      displayBarsEvery = 8
      this.cellSize = stepWidth * 8
    }

    // number of bars
    let nbBars = Math.floor(width / barWidth);
    // draw bars
    const lineColor = "#545252"
    for (
      let currentBarNumberXpos = 0;
      currentBarNumberXpos < nbBars;
      currentBarNumberXpos++
    ) {
      if (displaySteps) {
        // draw vertical lines for steps, less visible
        this.grid.lineStyle(0.5, lineColor, 0.1);
        for (let y = 0; y < nbSteps; y++) {
          this.grid.beginFill(lineColor, 0.5);
          // Grid should be as high as the canvas
          this.grid.drawRect(
            currentBarNumberXpos * barWidth + y * stepWidth,
            17,
            1,
            height
          );
        }
      }

      const barNumber = currentBarNumberXpos;
      if (displayBarsEvery === 1 || barNumber % displayBarsEvery === 0) {
        // draw bar separator
        this.grid.lineStyle(1, lineColor, 0.5)
        // draw vertical line for bar separator
        this.grid.beginFill(lineColor, 0.5)
        // Grid should be as high as the canvas
        this.grid.drawRect(currentBarNumberXpos * barWidth, 7, 1, height)

        // using pixi draw text just after bar separator
        const text = this.addChild(
          new BitmapText((barNumber + 1).toString(), {
            fontSize: 10,
            fontName: "GridViewFont",
            tint: 0xe3e3e3, //0x858181,
            align: "left",
          })
        );
        text.anchor.set(0.5)
        text.resolution = 1
        text.x = currentBarNumberXpos * barWidth + 8
        text.y = 17

        this.listOfTextElements.push(text)
      } else {
        // do not display the bar number
      }
    }
  }

  clearGrid() {
    this.grid.clear()
    this.listOfTextElements.forEach((element) => {
      this.removeChild(element)
    })

    this.listOfTextElements = []
  }

  updateGrid() {
    this.clearGrid()
    this.draw()
  }

  resize() {
      this.updateGrid();
  }
}
