function parseNotes(text, uid){
  var nodes=[], stack=[], group=null;
  var lines=String(text).replace(/\r/g,"").split("\n");
  lines.forEach(function(line){
    if(!line.trim())return;
    var s=line.normalize("NFC").replace(/\\([\[\]*_#`~\-.!()])/g,"$1");
    var indent=s.match(/^[ \t]*/)[0].replace(/\t/g,"    ").length;
    var t=s.trim();
    if(/^\*\*[^*].*\*\*$/.test(t)){
      var gt=t.replace(/^\*\*|\*\*$/g,"").replace(/[:：]\s*$/,"").trim();
      if(gt){
        group={id:uid(),parent:null,kind:"group",title:gt,done:false,last:false,dur:60,energy:"heavy",day:"today",pin:null,s:null,doneDay:null,collapsed:false};
        nodes.push(group);stack=[];
      }
      return;
    }
    var m=t.match(/^(?:\d+[.)]|[-+])\s+(.*)$/);
    var listed=!!m;
    var body=m?m[1]:t;
    var done=/\[done\]/i.test(body)||/\[x\]/i.test(body);
    var last=/làm cuối/i.test(body);
    body=body.replace(/\[done\]/ig,"").replace(/\[x\]/ig,"").replace(/\[ \]/g,"")
      .replace(/\*+/g,"").replace(/làm cuối/ig,"").replace(/\s+/g," ").trim()
      .replace(/[:：]\s*$/,"").trim();
    if(!body)return;
    var kind=(!listed&&!done&&indent===0)?"note":"task";
    while(stack.length&&stack[stack.length-1].indent>=indent)stack.pop();
    var parent=stack.length?stack[stack.length-1].node.id:(group?group.id:null);
    var node={id:uid(),parent:parent,kind:kind,title:body,done:done,last:last,dur:60,energy:"heavy",day:"today",pin:null,s:null,doneDay:null,collapsed:false};
    nodes.push(node);
    if(kind==="task")stack.push({indent:indent,node:node});
  });
  var byId={};nodes.forEach(function(n){byId[n.id]=n});
  nodes.forEach(function(n){
    var p=n.parent?byId[n.parent]:null;
    if(p&&p.kind==="task"&&p.done&&n.kind==="task")n.done=true;
  });
  return nodes;
}
