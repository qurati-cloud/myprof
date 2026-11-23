from pathlib import Path
import json,shutil
root=Path(__file__).resolve().parent.parent
out=root/'_site'
if out.exists(): shutil.rmtree(out)
out.mkdir()
for name in ['index.html','app.css','app.js','manifest.webmanifest','sw.js']:
    shutil.copy2(root/name,out/name)
shutil.copytree(root/'assets',out/'assets')
if (root/'CNAME').exists(): shutil.copy2(root/'CNAME',out/'CNAME')
def data(path):return json.loads((root/path).read_text(encoding='utf8'))
def items(folder):
    found=[]
    for f in (root/'content'/folder).glob('*.json'):
        obj=data(f.relative_to(root))
        if isinstance(obj,dict) and obj.get('published',True):
            obj['id']=f.stem
            found.append(obj)
    return sorted(found,key=lambda item:(item.get('order',999),item.get('title_en','')))
catalog={'settings':data('content/site.json'),'texts':{l:data('content/texts/'+l+'.json') for l in ('ar','en','fr')},'courses':items('courses'),'books':items('books')}
(out/'data').mkdir()
(out/'data/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
(out/'.nojekyll').touch()
print('Build OK:',len(catalog['courses']),'courses,',len(catalog['books']),'books')
