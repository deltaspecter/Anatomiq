import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const want = new RegExp(process.argv[3])
const doc = await io.read(process.argv[2])
for (const n of doc.getRoot().listNodes()) if (n.getMesh() && want.test(n.getName())) {
  const m = n.getWorldMatrix(); const min=[1e9,1e9,1e9], max=[-1e9,-1e9,-1e9]; const v=[0,0,0]
  for (const p of n.getMesh().listPrimitives()) { const a=p.getAttribute('POSITION'); for (let i=0;i<a.getCount();i++){a.getElement(i,v); const w=[0,1,2].map(k=>m[k]*v[0]+m[4+k]*v[1]+m[8+k]*v[2]+m[12+k]); for(let k=0;k<3;k++){min[k]=Math.min(min[k],w[k]);max[k]=Math.max(max[k],w[k])}}}
  console.log(n.getName().padEnd(34), min.map(x=>x.toFixed(3)).join(' '), '|', max.map(x=>x.toFixed(3)).join(' '))
}
