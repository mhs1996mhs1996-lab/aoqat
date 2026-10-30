"""Build Hawija's launch portrait from the approved icon and the established
ivory / emerald / gold scenic composition. This creates one native PNG; it does
not add Quran assets or alter any web content.
"""
from pathlib import Path
from math import sin, cos, pi
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import argparse
import random

ROOT=Path(__file__).resolve().parent.parent
W,H=711,1536

def mix(a,b,t):
    t=max(0.,min(1.,t))
    return tuple(round(a[i]*(1-t)+b[i]*t) for i in range(3))

def gradient():
    im=Image.new("RGB",(W,H))
    d=ImageDraw.Draw(im)
    keys=[(0,(255,251,240)),(430,(255,250,236)),(920,(255,246,225)),
          (1100,(255,237,190)),(1230,(245,211,149)),
          (1360,(159,180,164)),(1536,(88,135,126))]
    for y in range(H):
        for i in range(len(keys)-1):
            if y<=keys[i+1][0]:
                a,c=keys[i],keys[i+1]
                color=mix(a[1],c[1],(y-a[0])/(c[0]-a[0]))
                break
        d.line((0,y,W,y),fill=color)
    # A very soft luminous aura behind the icon and the horizon
    glow=Image.new("RGBA",(W,H),(0,0,0,0))
    g=ImageDraw.Draw(glow)
    g.ellipse((-130,85,810,1050),fill=(255,255,241,50))
    g.ellipse((205,1030,615,1430),fill=(255,223,134,90))
    glow=glow.filter(ImageFilter.GaussianBlur(90))
    return Image.alpha_composite(im.convert("RGBA"),glow)

def tracery(base):
    layer=Image.new("RGBA",(W,H))
    d=ImageDraw.Draw(layer)
    gold=(220,184,117,64)
    for side in (0,1):
        cx=-39 if side==0 else W+39
        # Lace-like arch petals are intentionally low contrast under the cream.
        for radius in (62,94,124,158,191):
            d.arc((cx-radius,-radius*0.76,cx+radius,radius*1.1),
                  0 if side==0 else 90, 275 if side==0 else 360,
                  fill=gold,width=5)
        for ring in range(2,7):
            for k in range(7):
                angle=(k*.43+.15)*pi * (1 if side==0 else -1)
                dist=ring*32
                x=cx+cos(angle)*dist
                y=4+abs(sin(angle))*dist
                rr=10+ring*2
                d.ellipse((x-rr,y-rr,x+rr,y+rr),outline=gold,width=4)
                d.line((x,y-rr,x+rr,y),fill=gold,width=2)
    # Framed tiles in the bottom corners echo the accepted illustration.
    sea=(17,96,89,155)
    pale=(233,195,128,155)
    for side in (0,1):
        cx=-6 if side==0 else W+6
        for j in range(4):
            cy=H-12-j*43
            for rad in (23,41,57):
                pts=[]
                for k in range(9):
                    ang=2*pi*k/8
                    x=cx+cos(ang)*rad*(1 if side==0 else -1)
                    y=cy+sin(ang)*rad
                    pts.append((x,y))
                d.line(pts,fill=pale if rad==41 else sea,width=5,joint="curve")
        for k in range(4):
            cx2=cx+(k*26 if side==0 else -k*26)
            cy=H-12-k*26
            d.ellipse((cx2-18,cy-18,cx2+18,cy+18),outline=sea,width=4)
    return Image.alpha_composite(base,layer)

def landscape(base):
    world=Image.new("RGBA",(W,H),(0,0,0,0))
    d=ImageDraw.Draw(world)
    dark=(42,89,84,120)
    middle=(72,105,94,110)
    # Distant town and towers
    buildings=[(12,1280,38,1320),(41,1256,65,1320),(62,1270,88,1320),
               (106,1292,141,1320),(338,1288,390,1320),(410,1267,450,1320),
               (450,1234,496,1320),(496,1260,545,1320),(550,1244,584,1320),
               (590,1276,623,1320),(629,1297,691,1320)]
    for x0,y0,x1,y1 in buildings:
        d.rectangle((x0,y0,x1,y1),fill=middle)
    # Central mosque silhouette: dome and minaret
    d.rectangle((156,1251,251,1333),fill=dark)
    d.ellipse((155,1201,253,1283),fill=dark)
    d.polygon([(199,1188),(189,1207),(209,1207)],fill=dark)
    d.line((199,1173,199,1192),fill=dark,width=3)
    d.ellipse((198,1166,205,1173),outline=dark,width=2)
    d.rectangle((264,1128,294,1330),fill=dark)
    d.polygon([(258,1140),(299,1140),(279,1102)],fill=dark)
    d.rectangle((257,1170,303,1180),fill=dark)
    d.rectangle((269,1086,289,1112),fill=dark)
    d.ellipse((269,1077,289,1097),fill=dark)
    d.line((279,1063,279,1079),fill=dark,width=3)
    d.rectangle((43,1194,58,1330),fill=middle)
    d.ellipse((40,1184,60,1200),fill=middle)
    # Palm trees with fronds
    for x,y,h in [(95,1293,77),(130,1298,83),(332,1310,52),(370,1302,58),
                  (600,1314,47),(655,1310,52)]:
        d.line((x,y,x-6,y-h),fill=dark,width=5)
        top=(x-6,y-h)
        for a in range(7):
            angle=-pi*.92+a*pi*.31
            tip=(top[0]+cos(angle)*32,top[1]+sin(angle)*23)
            d.line((top[0],top[1],tip[0],tip[1]),fill=dark,width=4)
    # Horizontal water horizon + soft mirrored skyline
    d.rectangle((0,1323,W,1536),fill=(62,129,127,60))
    for x,y,length in [(210,1349,115),(250,1374,165),(268,1399,110),
                       (285,1434,195),(315,1490,86),(245,1522,180)]:
        d.ellipse((x-length//2,y-2,x+length//2,y+4),fill=(255,225,156,61))
    for y in range(1338,H,16):
        d.line((10+(y%37),y,685-(y%43),y),fill=(247,221,171,24),width=2)
    # The horizon should remain atmospheric, not a sharp opaque city graphic.
    world=world.filter(ImageFilter.GaussianBlur(2.8))
    base=Image.alpha_composite(base,world)
    veil=Image.new("RGBA",(W,H),(0,0,0,0))
    v=ImageDraw.Draw(veil)
    for y in range(1070,1440):
        a=round(43*(1-abs((y-1240)/280)))
        if a>0: v.line((0,y,W,y),fill=(255,239,201,a))
    return Image.alpha_composite(base,veil)

def title_and_logo(base):
    art=Image.open(ROOT/"android-native/app/src/main/res/mipmap/app_icon.png").convert("RGBA")
    # The source app icon has a flat white square around its gold rounded edge.
    # Remove only the exterior connected white field to preserve the exact logo.
    from collections import deque
    px=art.load()
    aw,ah=art.size
    seen=bytearray(aw*ah)
    todo=deque([(0,0),(aw-1,0),(0,ah-1),(aw-1,ah-1)])
    while todo:
        x,y=todo.popleft()
        if x<0 or y<0 or x>=aw or y>=ah:continue
        index=y*aw+x
        if seen[index]:continue
        seen[index]=1
        r,g,b,a=px[x,y]
        if r<232 or g<232 or b<232 or max(r,g,b)-min(r,g,b)>18:continue
        px[x,y]=(r,g,b,0)
        todo.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    art=art.resize((501,501),Image.Resampling.LANCZOS)
    # A small shadow grounds the exact approved app logo.
    shadow=Image.new("RGBA",base.size,(0,0,0,0))
    shadow.paste(Image.new("RGBA",art.size,(40,52,36,35)),(105,357),art.getchannel("A"))
    base=Image.alpha_composite(base,shadow.filter(ImageFilter.GaussianBlur(15)))
    base.alpha_composite(art,(105,357))
    d=ImageDraw.Draw(base)
    font=Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    if not font.exists():font=ROOT/"assets/fonts/amiri-quran.ttf"
    f=ImageFont.truetype(str(font),size=47)
    caption="أوقات الصلاة في الحويجة"
    kwargs={"direction":"rtl"} if ImageFont.core.HAVE_RAQM else {}
    # Center the headline on its actual visual box, above the gold divider.
    try:
        d.text((W/2,924),caption,font=f,fill=(17,65,51,255),anchor="mm",**kwargs)
    except Exception:
        bbox=d.textbbox((0,0),caption,font=f)
        d.text(((W-(bbox[2]-bbox[0]))/2,897),caption,font=f,fill=(17,65,51,255))
    # Golden ornamental separator under the title
    gold=(189,144,72,180)
    d.line((225,990,322,990),fill=gold,width=2)
    d.line((390,990,486,990),fill=gold,width=2)
    d.polygon([(355,965),(380,990),(355,1015),(330,990)],outline=gold)
    d.polygon([(355,975),(371,990),(355,1005),(339,990)],outline=gold)
    for x in (349,355,361):
        d.line((x,978,x,1002),fill=gold,width=2)
    return base

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    base=gradient()
    base=tracery(base)
    base=landscape(base)
    base=title_and_logo(base)
    output=Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    base.convert("RGB").save(output,format="PNG",optimize=True)
    print("Created",output,output.stat().st_size,"bytes",base.size)

if __name__=="__main__":
    main()
