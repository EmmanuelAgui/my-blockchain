import { SHA256 } from 'crypto-js';
import { Subscription, interval, ReplaySubject, BehaviorSubject, timer } from 'rxjs';
import { tap, map, first, filter, concatMap,  takeUntil, skip, distinctUntilKeyChanged, scan } from 'rxjs/operators';

export interface Block{
    data:any;
    hash:string;
    prev:string;
    nonce:number;
    height:number;
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
    static base:Block = {hash:0,height:-1} as any;

    static connect(id:string,node:Node){
        const newNode = new Node(id);
        node.connect(newNode);
        newNode.connect(node);
        newNode.listen();

        return newNode;
    }

    static create(id:string){
        const newNode = new Node(id);
        newNode.initChain('Genesis');
        newNode.listen();

        return newNode;
    }

    static getEventHistory(replay$:ReplaySubject<Block>){
        const events = [];

        replay$.pipe(takeUntil(timer(1))).subscribe(event=>events.push(event));

        return events;
    }

    static getLastEvent(replay$:ReplaySubject<Block>){
        const events = Node.getEventHistory(replay$);

        return events.length?events.pop():Node.base;
    }

    static validateChain(lastBlock:Block,block:Block){
        if(!lastBlock || !Node.validateBlock(lastBlock,block)){
            return;
        }

        return block;
    }

    static validateBlock(lastBlock:Block,block:Block){
        return (
            Node.validateParent(lastBlock,block) &&
            Node.validateDifficulty(block.hash) &&
            Node.validateHash(block)
        )
    }

    static validateHash(block:Block){
        const { hash } = block;
        const tempBlock = {...block};

        delete tempBlock.hash;

        return hash === SHA256(JSON.stringify(tempBlock)).toString();
    }

    static validateParent(lastBlock:Block,block:Block){
        return lastBlock.hash === block.prev &&
            lastBlock.height + 1 === block.height;
    }

    static validateDifficulty(hash:string){
        return /^00/.test(hash);
    }

    public chain$ = new ReplaySubject<Block>();
    public connections$ = new BehaviorSubject<Connection[]>([]);
    public mine$ = new BehaviorSubject<MineData>({_time:0} as any);

    constructor(public id:string){}

    initChain(data:any){
        this.mine(data).subscribe(block=>this.chain$.next(block));
    }

    process(data:any){
        this.mine$.next({
            data,
            _ref:this.id,
            _time:Date.now()
        });
    }

    listen(){
        this.mine$
            .pipe(
                filter(event=>event&&event.data),
                concatMap(({data})=>this.mine(data)),
                filter(block=>Node.validateBlock(Node.getLastEvent(this.chain$),block)),
            ).subscribe(this.chain$)
    }

    connect(node:Node){
        const history = Node.getEventHistory(node.chain$);

        const isValid = !!history.reduce(Node.validateChain,Node.base);

        if(!isValid){
            this.invalidate(node.id);
        }

        const mineSubs = this.connectMine(node);
        const chainSubs = this.connectChain(node);

        this.connections$.next([
            ...this.connections$.value,
            { mineSubs, chainSubs, id:node.id }
        ]);
    }

    invalidate(id:string){
        this.disconnect(id);

        throw new Error(`Disconnected from node ${id}`);
    }

    connectMine(node:Node){
        return node.mine$.pipe(
            skip(1),
            filter(event => event._ref !==  this.id),
            filter(event => event._time > this.mine$.value._time)
        ).subscribe(this.mine$);
    }

    connectChain(node:Node){
        return node.chain$.pipe(
            distinctUntilKeyChanged('hash'),
            scan((lastBlock,block) => 
                Node.validateChain(lastBlock,block) ? block :
                    this.invalidate(node.id) as any
                , Node.base),
            filter(block=>block.height > Node.getLastEvent(this.chain$).height)
        ).subscribe(this.chain$)
    }

    disconnect(id:string){
        const conn = this.connections$.value.find(item=>item.id===id);

        if(conn){
            conn.chainSubs.unsubscribe();
            conn.mineSubs.unsubscribe();
            this.connections$.next(
                this.connections$.value.filter(item=>item.id!==id)
            );
        }
    }



    mine(data:string){
        const lastBlock = Node.getLastEvent(this.chain$);

        const block = {
            data,
            nonce:0,
            minedBy:this.id,
            prev:lastBlock.hash,
            height:lastBlock.height+1,
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