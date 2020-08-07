import { Component, Input } from "@angular/core";
import { Block } from "./node";

@Component({
    styles: [`
    table, th, td {
      margin: 0 10px;
      border-collapse: collapse;
    }
    
    th, td {
      white-space: nowrap;
      border: 1px solid;
    }
    
    tr:nth-child(2n) th, tr:nth-child(2n) td {
      background-color: #deebf0;
    }
  `],
  selector: 'block-component',
  template: `
    <div>
      <table>
        <tr>
          <th>Index</th>
          <td>{{block.index}}</td>
        </tr>

        <tr>
          <th>Data</th>
          <td>{{block.data}}</td>
        </tr>
        
        <tr>
          <th>Mined By</th>
          <td>{{block.minedBy}}</td>
        </tr>
        
        <tr>
          <th>Timestamp</th>
          <td>{{block.timestamp}}</td>
        </tr>

        <tr>
          <th>Hash</th>
          <td>{{block.hash}}</td>
        </tr>

        <tr>
          <th>Parent Hash</th>
          <td>{{block.prev}}</td>
        </tr>

        <tr>
          <th>Nonce</th>
          <td>{{block.nonce}}</td>
        </tr>
      </table>
    </div>
  `,
})
export class BlockComponent{
    @Input()
    public block:Block;
}