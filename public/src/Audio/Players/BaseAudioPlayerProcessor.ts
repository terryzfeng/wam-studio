

// TODO gérer la durée de vie du processor pour éviter les fuites de mémoire
// Voir: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process#return_value
/**
 * A base audio processor for playing audio content.
 */

import type { AudioWorkletGlobalScope, WamProcessor as WPT } from "@webaudiomodules/api";

export interface IBaseAudioPlayerProcessor{
    /**
     * Write a part of the readed audio content to the output buffer
     * @param from From where to start the reading in milliseconds 
     * @param to To where to stop the reading in milliseconds exclusive
     * @param msRate The ms rate in milliseconds per sample
     */
    play(
        from:number, to:number, msRate:number,
        inputs:Float32Array[][], outputs:Float32Array[][],
        parameters:Record<string, Float32Array>
    ): void

    /**
     * Treat a received message
     * @param event 
     */
    onmessage(event: MessageEvent): void
}

export function getBaseAudioPlayerProcessor(moduleId: string){

    const { webAudioModules } = globalThis as unknown as AudioWorkletGlobalScope
    const moduleScope= webAudioModules.getModuleScope(moduleId)
    const { WamProcessor } = moduleScope as {WamProcessor:typeof WPT}

    abstract class BaseAudioPlayerProcessor extends WamProcessor implements IBaseAudioPlayerProcessor  {

        /** The playhead position in milliseconds */
        playhead= 0
        /**The previous playhead position in milliseconds */
        previousPlayhead= 0
    
        /** The loop start in milliseconds or -1 */
        loopStart= -1
        /** The loop end in milliseconds */
        loopEnd= 0
    
        /** Do the processor should live or be destroyed*/
        shouldLive= true
        
    
        constructor(options: any){
            super(options)
            this.port.onmessage= this.onmessage.bind(this)
        }
    
        onmessage(event: MessageEvent){
            if("playhead" in event.data){
                this.playhead = event.data.playhead
                this.previousPlayhead = this.playhead-1
            }
            if("loopStart" in event.data) this.loopStart = event.data.loopStart
            if("loopEnd" in event.data) this.loopEnd = event.data.loopEnd
            if("shouldLive" in event.data) this.shouldLive = event.data.shouldLive
        }
        
        override process(inputs:Float32Array[][], outputs:Float32Array[][], parameters:Record<string, Float32Array>): boolean  {
            if(parameters["isPlaying"][0]<0.5)return true
    
            // Move the playhead
            this.previousPlayhead= this.playhead
            const msRate= 1000/sampleRate
            this.playhead+= outputs[0][0].length*msRate
    
            // Play the note
            this.play(this.previousPlayhead, this.playhead, msRate, inputs, outputs, parameters)
    
            // Move the playhead in the node
            this.port.postMessage({playhead: this.playhead})
    
            return this.shouldLive
        }
    
        /**
         * Write a part of the readed audio content to the output buffer
         * @param from From where to start the reading in milliseconds 
         * @param to To where to stop the reading in milliseconds exclusive
         * @param msRate The ms rate in milliseconds per sample
         */
        abstract play(
            from:number,
            to:number, 
            msRate:number,
            inputs:Float32Array[][],
            outputs:Float32Array[][],
            parameters:Record<string, Float32Array>
        ): void
        
        static override parameterDescriptors=[
            {name:"isPlaying", defaultValue:0, minValue:0, maxValue:1, automationRate:"k-rate" as const},
        ]
    }

    moduleScope.BaseAudioPlayerProcessor= BaseAudioPlayerProcessor
}