"""Read the supplied XLSX without editing it. Python standard library only."""
import sys,zipfile,xml.etree.ElementTree as ET,json,csv,hashlib
from pathlib import Path
source=Path(sys.argv[1]);dest=Path(__file__).parent/'data';dest.mkdir(exist_ok=True)
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as z:
    strings=[''.join(t.text or '' for t in s.findall('.//m:t',ns)) for s in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
    root=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));items=[]
    for row in root.findall('m:sheetData/m:row',ns)[1:]:
        values={}
        for cell in row.findall('m:c',ns):
            v=cell.find('m:v',ns);value=v.text if v is not None else ''
            if cell.get('t')=='s':value=strings[int(value)]
            if cell.get('t')=='inlineStr':value=''.join(t.text or '' for t in cell.findall('.//m:t',ns))
            values[''.join(filter(str.isalpha,cell.get('r')))]=value
        fields={'code':'A','name':'B','picture':'C','dim1':'D','dim2':'E','model':'F','oldCode':'G','manufacturerCode':'H','url':'I','manufacturer':'J'}
        item={key:values.get(col,'') for key,col in fields.items()}
        if item['manufacturer'].startswith('#'):item['manufacturer']='Non indicato'
        if item['code']:items.append(item)
assert len(items)==8875 and len({x['code'] for x in items})==8875
out={'version':1,'source':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'items':items}
(dest/'catalog.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
pics=sorted({x['picture'] for x in items if x['picture']})
with (dest/'immagini_attese.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.writer(f,delimiter=';');writer.writerow(['Nome file','Numero articoli']);writer.writerows((pic,sum(x['picture']==pic for x in items)) for pic in pics)
print(json.dumps({'articles':len(items),'imageFilenames':len(pics),'missingImageReference':sum(not x['picture'] for x in items),'manufacturers':len(set(x['manufacturer'] for x in items))}))
