"""Render only the public official PDF page; no application data or credentials."""
from pathlib import Path
import hashlib, json, math, struct, subprocess, xml.etree.ElementTree as ET
root=Path("official-source")
pdf=root/"official.pdf"
subprocess.run(["pdftotext","-f","33","-l","33","-bbox",str(pdf),str(root/"page-bbox.html")],check=True)
tree=ET.parse(root/"page-bbox.html")
page=next(x for x in tree.iter() if x.tag.endswith("page"))
words=[x for x in page.iter() if x.tag.endswith("word")]
titles=[x for x in words if "図Ⅲ" in "".join(x.itertext()) and ("７" in "".join(x.itertext()) or "7" in "".join(x.itertext()))]
if len(titles)!=1:
    raise RuntimeError("Official figure title cannot be located uniquely; no crop produced")
scale=180/72
page_width=float(page.attrib["width"]);page_height=float(page.attrib["height"])
left=20;top=max(0,float(titles[0].attrib["yMin"])-5);right=page_width-20;bottom=page_height-35
if not (0<=left<right<=page_width and 0<=top<bottom<=page_height):
    raise RuntimeError("Invalid official figure crop")
crop=[math.floor(left*scale),math.floor(top*scale),math.ceil((right-left)*scale),math.ceil((bottom-top)*scale)]
subprocess.run(["pdftoppm","-f","33","-l","33","-singlefile","-r","180","-png",str(pdf),str(root/"official-page-33")],check=True)
subprocess.run(["pdftoppm","-f","33","-l","33","-singlefile","-r","180","-png","-x",str(crop[0]),"-y",str(crop[1]),"-W",str(crop[2]),"-H",str(crop[3]),str(pdf),str(root/"official-figure-p27")],check=True)
images=[]
for name in ["official-page-33.png","official-figure-p27.png"]:
    content=(root/name).read_bytes()
    if content[:8]!=bytes([137,80,78,71,13,10,26,10]):raise RuntimeError("Not PNG")
    width,height=struct.unpack(">II",content[16:24])
    images.append({"name":name,"width":width,"height":height,"sha256":hashlib.sha256(content).hexdigest()})
metadata={"source_url":"https://www.stat.go.jp/data/zenkokukakei/2024/pdf/gaiyou0828.pdf","pdf_page":33,"printed_page":27,"pdf_sha256":hashlib.sha256(pdf.read_bytes()).hexdigest(),"figure_title":"".join(titles[0].itertext()),"crop_pixels":crop,"render_dpi":180,"images":images,"visual_review":"pending","user_review":"not_recorded"}
(root/"source-metadata.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(metadata,ensure_ascii=False))
