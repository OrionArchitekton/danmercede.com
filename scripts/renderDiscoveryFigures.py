"""Render exact article figures with Pillow; no generative imagery or private data."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(__file__).resolve().parents[1]
FONT = Path('/usr/share/fonts/truetype/dejavu')
BG, PANEL, WHITE, TEXT, MUTED, COPPER = '#0B1120', '#12233B', '#F8FAFC', '#CBD5E1', '#94A3B8', '#E5AF7D'

def font(n, bold=False):
    return ImageFont.truetype(str(FONT / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), n)

def make():
    im = Image.new('RGB', (1200, 630), BG)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 10, 630), fill=COPPER)
    return im, d

def text(d, xy, value, size=22, fill=TEXT, bold=False):
    d.text(xy, value, font=font(size, bold), fill=fill)

def card(d, box, accent=False):
    d.rounded_rectangle(box, radius=13, fill=PANEL, outline=COPPER if accent else '#36506D', width=2)

def arrow(d, start, end, color=COPPER, width=3):
    d.line((start, end), fill=color, width=width)
    a=math.atan2(end[1]-start[1],end[0]-start[0]); s=12
    points=[end,(end[0]-s*math.cos(a-.45),end[1]-s*math.sin(a-.45)),(end[0]-s*math.cos(a+.45),end[1]-s*math.sin(a+.45))]
    d.polygon(points, fill=color)

def save(im, topic, name):
    folder=ROOT/'public'/'assets'/'guides'/topic
    folder.mkdir(parents=True, exist_ok=True)
    im.save(folder/f'{name}.webp', quality=92, method=6)
    im.resize((768,403), Image.Resampling.LANCZOS).save(folder/f'{name}-768w.webp', quality=89, method=6)

im,d=make()
text(d,(60,40),'PROCTOR / BEHAVIORAL REGRESSION',18,COPPER,True)
text(d,(60,91),'Same shape. Wrong total.',46,WHITE,True)
text(d,(60,155),'An explicit invariant catches a plausible but incorrect invoice.',23)
for x in (60,445,830): card(d,(x,232,x+310,465),accent=x==830)
text(d,(82,255),'01  FIXTURE',17,MUTED,True)
text(d,(82,301),'100 + 50',38,WHITE,True)
text(d,(82,364),'Expected total: 150',22)
text(d,(82,411),'Source fixture: inv-001',17,MUTED)
text(d,(467,255),'02  CANDIDATE',17,MUTED,True)
text(d,(467,301),'Total: 100',36,WHITE,True)
text(d,(467,364),'Fields still present',22)
text(d,(467,411),'Shape alone can pass',17,MUTED)
text(d,(852,255),'03  CONTRACT',17,COPPER,True)
text(d,(852,303),'150 ≠ 100',35,WHITE,True)
text(d,(852,364),'REGRESSION',24,COPPER,True)
text(d,(852,411),'sum(items) = total fails',17,TEXT)
arrow(d,(382,345),(431,345)); arrow(d,(767,345),(816,345))
text(d,(60,507),'Keyless demo: deterministic invoice fixtures, not a live model run.',20,TEXT)
text(d,(60,548),'A CI adapter must block on the report, not the demo process exit code.',18,MUTED)
text(d,(60,592),'danmercede.com / guides',16,MUTED)
save(im,'agent-regression','contract-regression')

im,d=make()
text(d,(60,40),'CONVERSATION BRANCHES / SYNTHETIC EXAMPLE',18,COPPER,True)
text(d,(60,91),'Keep the branch. Choose a path.',42,WHITE,True)
text(d,(60,155),'Arrows point back to parents. Sibling answers never become a sequence.',21)
# Draw parent relationships behind the nodes, with selected branch in copper.
arrow(d,(448,264),(310,337),'#60738A')
arrow(d,(448,431),(310,350),COPPER)
arrow(d,(875,264),(742,264),'#60738A')
arrow(d,(875,431),(742,431),COPPER)
boxes=[(60,292,310,396,'u1  /  USER','Can we ship?',True),
       (448,212,742,316,'a1  /  ASSISTANT','Check tests',False),
       (875,212,1140,316,'u2  /  USER','Tests passed',False),
       (448,379,742,483,'a2  /  ASSISTANT','Check rollback',True),
       (875,379,1140,483,'u3  /  USER','Rollback ready',True)]
for x,y,x2,y2,title,body,selected in boxes:
    card(d,(x,y,x2,y2),selected)
    text(d,(x+18,y+17),title,17,COPPER if selected else MUTED,True)
    text(d,(x+18,y+53),body,24,WHITE,True)
text(d,(60,530),'Stored: 5 messages + 4 parent links',22,TEXT)
text(d,(60,566),'Selected transcript: u1 → a2 → u3',22,COPPER,True)
text(d,(875,586),'danmercede.com',16,MUTED)
save(im,'conversation-branches','preserve-branches')
print('Rendered 4 WebP assets (1200w + 768w per topic).')
