import { Component, Input, OnInit } from '@angular/core';
import { Node, Block } from './node';
import { Observable } from 'rxjs';
import { scan, tap, switchMap, concatMap } from 'rxjs/operators';
import { IndexDbService } from './database.service';

@Component({
    styles:[`
        :host {
            display: flex;
            flex-direction: row;
            overflow-x: scroll;
            margin: 10px 0;
        }
    
        form {
            display: inline-block;
        }

        .block{
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
            <button (click)="rebuild()">重建</button>

            <h4>Connections</h4>
            <span *ngFor="let conn of node.connections$ | async" (click)="node.disconnect(conn.id)">{{conn.id}}</span>
        </form>
  
        <block-component class="block" *ngFor="let block of blocks | async" [block]="block"></block-component>
        <br>
        <block-component class="ablock" *ngFor="let ablock of rebuildBlocks | async" [block]="ablock"></block-component>
        

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
    public rebuildBlocks:Observable<Block[]>

    constructor(public indexDB:IndexDbService){}

    public ngOnInit(){
        if(this.parent){
            console.log('NodeComponent ngOnInit')
            this.node = Node.connect(this.id,this.parent);
        }else{
            this.node = Node.create(this.id);
        }
        // this.node = Node.create(this.id)

        this.blocks = this.node.chain$.pipe(
            tap(block=>console.log(`in NodeComponent chain$`,block)),
            scan((blocks,block)=>[block, ...blocks], []));

        // store in database
        const inputStreamSub = this.node.chain$.pipe(concatMap(block =>this.indexDB.put('block',block))).subscribe()
    }

    public mine(){
        this.node.process(this.data);
        this.data='';
    }

    rebuild(){
        // this.blocks = null;
        this.rebuildBlocks = this.indexDB.query('block').pipe(
            scan((blocks,block)=>[block,...blocks],[])
        )
    }
}