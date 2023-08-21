import App from "../../App";
import EditorView from "../../Views/Editor/EditorView";
import OperableAudioBuffer from "../../Audio/OperableAudioBuffer";
import Region from "../../Models/Region";
import {RATIO_MILLS_BY_PX} from "../../Utils/Constants";
import {FederatedPointerEvent} from "pixi.js";
import WaveformView from "../../Views/Editor/WaveformView";
import RegionView from "../../Views/Editor/RegionView";


export default class RegionsController {

    app: App;
    editor: EditorView;

    regionIdCounter: number;

    isMovingRegion: boolean;
    selectedRegion: RegionView | undefined;

    constructor(app: App) {
        this.app = app;
        this.editor = this.app.editorView;

        this.regionIdCounter = 0;
        this.isMovingRegion = false;

        this.bindEvents();
    }

    bindEvents() {
        // On escape key pressed, deselect the selected waveform
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.deselectRegion();
            }
        });
        // On delete key pressed, delete the selected region
        document.addEventListener("keydown", (e) => {
            if ((e.key === "Delete" || e.key === "Backspace") && this.selectedRegion !== undefined) {
                this.deleteRegion(this.selectedRegion.id, this.selectedRegion.trackId);
            }
        });
    }

    createRegion(trackId: number, buffer: OperableAudioBuffer, start: number) {
        return new Region(trackId, buffer, start, this.getNewId());
    }

    getNewId() {
        return this.regionIdCounter++;
    }

    deleteRegion(regionId: number, trackId: number) {
        let track = this.app.tracksController.getTrack(trackId);
        if (track === undefined) throw new Error("Track not found");
        let waveformView = this.editor.getWaveFormViewById(track.id);
        if (waveformView === undefined) throw new Error("Waveform not found");
        let region = track.getRegion(regionId);
        if (region === undefined) throw new Error("Region not found");
        let regionView = waveformView.getRegionView(regionId);
        if (regionView === undefined) throw new Error("RegionView not found");

        waveformView.removeRegionView(regionView);
        track.removeRegion(region.id);
        if (this.selectedRegion === regionView) {
            this.deselectRegion();
        }
        track.modified = true;
    }

    selectRegion(region: RegionView) {
        if (this.selectedRegion !== region) {
            this.deselectRegion();
            this.selectedRegion = region;
            this.selectedRegion.select();
        }
    }

    deselectRegion() {
        if (this.selectedRegion !== undefined) {
            this.selectedRegion.deselect();

            this.selectedRegion = undefined;
        }
    }

    defineRegionListeners(region: Region, regionView: RegionView, waveFormView: WaveformView) {
        regionView.on("pointerdown", (_e) => {
            this.selectRegion(regionView);
            waveFormView.startMovingRegion(regionView, _e.data.global.x, _e.data.global.y);
            this.isMovingRegion = true;
        });
        regionView.on("pointermove", (_e) => {
            if (this.isMovingRegion) {
                waveFormView.moveRegion(_e.data.global.x, _e.data.global.y);
                region.updateStart(regionView.position.x * RATIO_MILLS_BY_PX);
                this.updateWaveformRegion(_e.data.global.y, region, regionView, waveFormView);
            }
        });
        regionView.on("pointerup", (_e) => {
            this.stopMovingRegion(regionView, region, waveFormView, _e);

        });
        regionView.on("pointerupoutside", (_e) => {
            this.stopMovingRegion(regionView, region, waveFormView, _e);
        });
    }

    stopMovingRegion(regionView: RegionView, region: Region, waveFormView: WaveformView, _e: FederatedPointerEvent) {
        if (this.isMovingRegion) {
            this.isMovingRegion = false;
            let track = this.app.tracksController.getTrack(region.trackId);
            if (track == undefined) {
                throw new Error("Track not found");
            }
            region.updateStart(regionView.position.x * RATIO_MILLS_BY_PX);
            track.modified = true;
            waveFormView.stopMovingRegion();
            track.updateBuffer(this.app.host.audioCtx, this.app.host.playhead);
        }
    }

    updateWaveformRegion(y: number, _region: Region, _regionView: RegionView, _waveFormView: WaveformView) {
        if (y < 0) y = 0;
        if (_regionView !== _waveFormView.movingRegion) return;
        let newWaveformView = this.editor.getWaveformView(y);
        if (newWaveformView !== _waveFormView && newWaveformView != undefined) {
            this.moveRegionToWaveform(_region, _regionView, _waveFormView, newWaveformView);
        }
    }

    moveRegionToWaveform(_region: Region, regionView: RegionView, oldWaveformView: WaveformView, newWaveformView: WaveformView) {
        let oldTrack = this.app.tracksController.getTrack(oldWaveformView.trackId);
        let newTrack = this.app.tracksController.getTrack(newWaveformView.trackId);
        if (oldTrack == undefined || newTrack == undefined) {
            throw new Error("Track not found");
        }

        _region.trackId = newTrack.id;
        oldTrack.modified = true;
        newTrack.modified = true;

        oldWaveformView.removeRegionView(regionView);
        let newRegionView = newWaveformView.createRegionView(_region);
        this.app.regionsController.defineRegionListeners(_region, newRegionView, newWaveformView);

        oldTrack.removeRegion(_region.id);
        newTrack.addRegion(_region);

        if (this.isMovingRegion) {
            this.selectRegion(newRegionView);
            newWaveformView.propagateMove(newRegionView, oldWaveformView)
        }
    }
}