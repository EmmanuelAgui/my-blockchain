import { Component, Input, OnInit } from '@angular/core';
import { Node, Block } from './node';
import { Observable } from 'rxjs';
import { scan, tap } from 'rxjs/operators';

@Component({
    styles:[`
        :host {
            display: flex;
            flex-direction: row;
            overflow-x: scroll;
            margin: 10px 0;
        }
    
        form, block-component {
            display: inline-block;
        }
        
        h3, h4 {
            margin: 5px 0;
        }
        
        span {
            font-size: 10px;
            display: inline-block;
            margin-right: 2px;
            cursor: pointer;
        }
        
        span:hover {
            text-decoration: underline;
        }
    `],
    selector:'node-component',
    template:`
        <form>
            <h3>{{id}}</h3>

            <input [(ngModel)]="data" name="value">
            <button (click)="mine()">挖矿</button>

            <h4>Connections</h4>
            <span *ngFor="let conn of node.connections$ | async" (click)="node.disconnect(conn.id)">{{conn.id}}</span>
        </form>
  
        <block-component *ngFor="let block of blocks | async" [block]="block"></block-component>
    `
})
export class NodeComponent implements OnInit {
    @Input()
    public parent:Node;

    @Input()
    public id:string;

    public node:Node;

    public data:string;

    public blocks:Observable<Block[]>

    public ngOnInit(){
        if(this.parent){
            this.node = Node.connect(this.id,this.parent);
        }else{
            this.node = Node.create(this.id);
        }
        // this.node = Node.create(this.id)

        this.blocks = this.node.chain$.pipe(
            tap(block=>console.log(`in NodeComponent chain$`,block)),
            scan((blocks,block)=>[block, ...blocks], []));
    }

    public mine(){
        this.node.process(this.data);
        this.data='';
        this.node.test();
    }
}