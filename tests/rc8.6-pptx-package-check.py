import zipfile,xml.etree.ElementTree as ET,posixpath
from pathlib import Path
files=list(Path('test-results').glob('*.pptx'));assert files
for p in files:
 with zipfile.ZipFile(p) as z:
  names=set(z.namelist());assert len(names)==len(z.namelist())
  for n in names:
   if n.endswith(('.xml','.rels')):ET.fromstring(z.read(n))
   if n.endswith('.rels'):
    parent='' if n=='_rels/.rels' else n.split('/_rels/')[0]
    for r in ET.fromstring(z.read(n)):
     assert r.get('TargetMode')!='External'
     assert posixpath.normpath(posixpath.join(parent,r.get('Target'))) in names
  t=ET.fromstring(z.read('[Content_Types].xml'));types={n.get('PartName')[1:]:n.get('ContentType') for n in t if n.tag.endswith('Override')}
  assert types['ppt/presentation.xml']=='application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'
  relationships=ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'));ids=[r.get('Id') for r in relationships];assert len(ids)==len(set(ids)), 'Relationship ID collision'
  root=ET.fromstring(z.read('ppt/presentation.xml'));assert len(root.find('{*}sldIdLst'))==7
  for i in range(1,8):
   assert types[f'ppt/slides/slide{i}.xml'].endswith('.slide+xml')
   assert types[f'ppt/notesSlides/notesSlide{i}.xml'].endswith('.notesSlide+xml')
   for part in (f'ppt/slides/slide{i}.xml', f'ppt/notesSlides/notesSlide{i}.xml'):
    runs=ET.fromstring(z.read(part)).findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}t')
    assert runs, f'Missing DrawingML text in {part}'
    assert all(not run.attrib for run in runs), f'DrawingML text does not allow attributes in {part}'
 print(p.name,'PASS: seven slides, editable text, notes, content types, XML and internal relationships; no external resources')
