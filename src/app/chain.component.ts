import { Component, ViewChild } from "@angular/core";
import { NodeComponent } from "./node.component";

@Component({
    selector: 'chain-component',
    template: `
        <div>
            <button (click)="addNode()">添加节点</button>
        </div>

        <node-component
            *ngFor="let id of nodes"
            [id]="id"
            [parent]="lastNode?.node">
        </node-component>
    `
})
export class ChainComponent{
    public nodes = [];

    @ViewChild(NodeComponent)
    public lastNode:NodeComponent=null;
    
    constructor(){
        this.addNode();
    }

    public addNode(){
        this.nodes.unshift(this.getRandomId());
    }

    private getRandomId(){
        return `node${Math.round(Math.random() * 10000000)}`;
    }
}
