import { SHA256 } from 'crypto-js';
import { Subscription, interval, ReplaySubject, BehaviorSubject } from 'rxjs';
import { tap, map, first, filter, concatMap } from 'rxjs/operators';

export interface Block{
    data:any;
    hash:string;
    prev:string;
    nonce:number;
    index:number;
    timestamp:number;
    minedBy:string;
}

export interface CyclicBlock extends Block{
    cyclic?:boolean;
}

export interface Connection{
    id:string;
    mineSubs:Subscription;
    chainSubs:Subscription;
}

interface MineData{
    data:any;
    _time:number;
    _ref:string;
}

export class Node{
    static base:Block = {hash:0,index:-1} as any;

    

    static connect(id:string,node:Node){
        const newNode = new Node(id);
        node.connect(newNode);
        newNode.connect(node);
        newNode.listen();

        return newNode;
    }

    static create(id:string){
        const newNode = new Node(id);
        mewNode.initChain('Genesis');
        newNode.listen();

        return newNode;
    }

    public chain$ = new ReplaySubject<Block>();
    public connections$ = new BehaviorSubject<Connection[]>([]);
    public mine$ = new BehaviorSubject<MineData>({_time:0} as any);

    constructor(public id:string){}

    initChain(data:any){
        this.mine
    }

    listen(){
        this.mine$
            .pipe(
                filter(event=>event&&event.data),
                concatMap(({data})=>this.mine(data)),
                filter(block=>Node.validateBlock(Node.getLastEvent(this.chain$),block)),
            ).subscribe(this.chain$)
    }

    mine(data:string){
        const lastBlock = Node.getLastEvent(this.chain$);

        const block = {
            data,
            nonce:0,
            minedBy:this.id,
            prev:lastBlock.hash,
            index:lastBlock.index+1,
            timestamp:Date.now()
        };

        return interval(0)
            .pipe(
                tap(nonce=>block.nonce=nonce),
                map(()=>SHA256(JSON.stringify(block))),
                first(hash=>Node.validateDifficulty(hash)),
                map<string,Block>(hash=>({
                    ...block,
                    hash:hash.toString()
                }))
            )
    }
}