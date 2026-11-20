import subprocess, os, sys, json
from playwright.sync_api import sync_playwright
FPS=30; OUT='/home/claude/oboardgame/video/rules/'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for g in sys.argv[1:]:
        pg=b.new_page(viewport={'width':1280,'height':720})
        pg.goto(f'http://localhost:8770/vid/play.html?g={g}'); pg.wait_for_function('window.ready'); pg.wait_for_timeout(1000)
        dur=pg.evaluate('DUR'); n=int(dur*FPS); json.dump(pg.evaluate('SCENES'),open(f'/home/claude/test/narr_{g}.json','w'),ensure_ascii=False)
        tmp=OUT+g+'.part.mp4'
        ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-crf','22','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart','-f','mp4',tmp],stdin=subprocess.PIPE)
        for i in range(n):
            pg.evaluate(f'renderAt({i/FPS})'); ff.stdin.write(pg.screenshot(type='jpeg',quality=90))
        ff.stdin.close()
        if ff.wait()==0: os.replace(tmp,OUT+g+'.mp4'); print('ok',g,round(dur,1),flush=True)
        pg.close()
