import type { AudioWorkletGlobalScope } from "@webaudiomodules/api"
import { IBaseAudioPlayerProcessor } from "../BaseAudioPlayerProcessor"


export function getMIDIPlayerProcessor(moduleId:string){

    const { webAudioModules } = globalThis as unknown as AudioWorkletGlobalScope
    const { BaseAudioPlayerProcessor } = webAudioModules.getModuleScope(moduleId)

    
    class MIDIPlayerProcessor extends BaseAudioPlayerProcessor implements IBaseAudioPlayerProcessor {

        instants: MIDIInstant[] | undefined
        instant_duration=1000
    
        constructor(options: any){
            super(options)
        }
    
        onmessage(e: MessageEvent<any>): void {
            super.onmessage(e)
            if("instants" in e.data) this.instants = e.data.instants
            if("instant_duration" in e.data) this.instant_duration=e.data.instant_duration
        }
    
        play(from: number, to: number, msRate: number, inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): void {
            if (!this.instants) return

            // Get the instant
            let instantI = Math.floor(from/this.instant_duration)
            if(instantI>=this.instants.length)return
            let instant = this.instants[instantI]

            // Get the from and to locally in the instant
            let localFrom= from-this.instant_duration*instantI
            let localTo= to-this.instant_duration*instantI
            let selectedNote=-1
            for(const {offset,note} of instant){
                if(localFrom<=offset && offset<localTo){
                    selectedNote=note.note
                    for(let c=0; c<outputs[0].length; c++){
                        for(let i=0; i<outputs[0][c].length; i++){
                            outputs[0][c][i] += Math.sin((currentFrame+i)/(selectedNote-200)*20)*0.2;
                        }
                    }
                    this.emitEvents(
                        { type: 'wam-midi', time: 0, data: { bytes: [0x90 | note.channel, note.note, note.velocity] } },
                        { type: 'wam-midi', time: note.duration-0.001, data: { bytes: [0x80 | note.channel, note.note, note.velocity] } }
                    )
                }
            }
        }
    
    }
    registerProcessor(moduleId, MIDIPlayerProcessor)
}