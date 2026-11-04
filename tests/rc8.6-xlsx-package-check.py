import zipfile,xml.etree.ElementTree as ET,posixpath
from pathlib import Path
files=list(Path('test-results').glob('*.xlsx'))
assert files,'No generated workbooks'
for p in files:
 with zipfile.ZipFile(p) as z:
  names=set(z.namelist())
  for name in names:
   if name.endswith(('.xml','.rels')):ET.fromstring(z.read(name))
   if name.endswith('.rels'):
    parent='' if name=='_rels/.rels' else name.split('/_rels/')[0]
    for rel in ET.fromstring(z.read(name)):
     if rel.get('TargetMode')=='External':continue
     target=posixpath.normpath(posixpath.join(parent,rel.get('Target')))
     assert target in names,(name,target)
  book=ET.fromstring(z.read('xl/workbook.xml'));sheets=book.find('{*}sheets');assert len(sheets)==6
  assert sheets[0].get('name')=='管理摘要';assert 'xl/charts/chart1.xml' in names
 print(p.name,'PASS: XML, internal relationships, six sheets, native chart')
