import assert from 'node:assert/strict';
import ts from 'typescript';

const writes=new Set(['put','delete','deleteAll','batch','exec','run','raw','dump','withSession','createMultipartUpload','resumeMultipartUpload','send']);
const globals=new Set(['fetch','WebSocket','XMLHttpRequest','eval','Function','require','process','console','caches']);
const environment=new Set(['PUBLIC_READ_MODEL','ASSETS','PUBLIC_ORIGIN','STUDIO_ORIGIN']);
const sqlWrites=/\b(?:INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH|PRAGMA)\b/i;
const property=expression=>ts.isPropertyAccessExpression(expression)?expression.name.text
  :ts.isElementAccessExpression(expression)&&ts.isStringLiteralLike(expression.argumentExpression)?expression.argumentExpression.text:null;

export function assertReaderSource(source,name='reader.mjs'){
  const file=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  let prepares=0;
  function walk(node){
    if(ts.isStringLiteralLike(node))assert.ok(!sqlWrites.test(node.text),'write SQL literal');
    if(ts.isCallExpression(node) || ts.isNewExpression(node)){
      const method=property(node.expression);
      const regexExec=method==='exec'&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.kind===ts.SyntaxKind.RegularExpressionLiteral;
      assert.ok(!writes.has(method)||regexExec,'write/unsafe provider API');
      if(ts.isIdentifier(node.expression))assert.ok(!globals.has(node.expression.text),'unsafe global/egress');
      if(method==='fetch')assert.fail('unsafe network/egress API');
      assert.notEqual(node.expression.kind,ts.SyntaxKind.ImportKeyword,'dynamic import');
      if(method==='prepare'){
        prepares++;assert.equal(node.arguments?.length,1,'dynamic SQL argument');
        assert.ok(ts.isIdentifier(node.arguments[0])&&node.arguments[0].text==='resolveSql','dynamic SQL argument');
        const bind=node.parent,call=bind?.parent,first=call?.parent,end=first?.parent;
        assert.ok(bind && ts.isPropertyAccessExpression(bind)&&bind.name.text==='bind'
          && call && ts.isCallExpression(call)&&call.arguments.length===1&&ts.isIdentifier(call.arguments[0])&&call.arguments[0].text==='code'
          && first && ts.isPropertyAccessExpression(first)&&first.name.text==='first'
          && end && ts.isCallExpression(end)&&end.arguments.length===0,'fixed parameterized first query');
      }
    }
    if(ts.isIdentifier(node)){
      assert.ok(!['console','process','require','caches'].includes(node.text),'unsafe ambient authority');
      if(node.text==='env')assert.ok((ts.isParameter(node.parent)&&node.parent.name===node)
        ||(ts.isPropertyAccessExpression(node.parent)&&node.parent.expression===node),'environment alias escape');
    }
    if(ts.isPropertyAccessExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='env'){
      assert.ok(environment.has(node.name.text),'unexpected environment binding/secret');
      if(['PUBLIC_READ_MODEL','ASSETS'].includes(node.name.text)){
        const use=node.parent;
        assert.ok(ts.isPropertyAccessExpression(use) && use.expression===node
          && (node.name.text==='PUBLIC_READ_MODEL'?use.name.text==='prepare':['get','head'].includes(use.name.text)),'native binding escapes read facade');
        assert.ok(ts.isCallExpression(use.parent)&&use.parent.expression===use,'native method alias');
      }
    }
    if(ts.isElementAccessExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='env')assert.fail('computed environment binding');
    ts.forEachChild(node,walk);
  }
  walk(file);return prepares;
}

export function assertReaderBundle(source,resolveSql){
  const file=ts.createSourceFile('bundle.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const normalize=sql=>sql.replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim();
  function walk(node){
    if(ts.isCallExpression(node)||ts.isNewExpression(node)){
      const method=property(node.expression);
      const regexExec=method==='exec'&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.kind===ts.SyntaxKind.RegularExpressionLiteral;
      assert.ok(!writes.has(method)||regexExec,'write/unsafe API in built artifact');
      if(ts.isIdentifier(node.expression))assert.ok(!globals.has(node.expression.text),'egress/dynamic code in built artifact');
      assert.notEqual(method,'fetch','outbound fetch in built artifact');
      assert.notEqual(node.expression.kind,ts.SyntaxKind.ImportKeyword,'dynamic import in built artifact');
    }
    if(ts.isStringLiteralLike(node)){
      const text=normalize(node.text);
      if(/^(?:SELECT|INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE|TRUNCATE)\s/i.test(text))assert.equal(text,normalize(resolveSql),'unexpected SQL in built artifact');
    }
    ts.forEachChild(node,walk);
  }
  walk(file);
}
