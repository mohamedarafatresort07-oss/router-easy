/* ═══════════════════════════════════════════════════════════════
   Router Easy — الجسر الأصلي (Native Bridge)
   ───────────────────────────────────────────────────────────────
   داخل الـAPK لا يوجد بايثون إطلاقاً.
   نستخدم CapacitorHttp الذي يرسل الطلبات من كود أندرويد الأصلي
   وليس من المتصفح → لا توجد حماية CORS تمنعنا.

   النتيجة: التطبيق يتصل بالراوتر مباشرة.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const CH = () => window.Capacitor?.Plugins?.CapacitorHttp;

  /* ── طلب HTTP أصلي (يتجاوز CORS) ── */
  async function http(opt) {
    const p = CH();
    if (!p) throw new Error("CapacitorHttp غير متاح");
    const res = await p.request({
      method: opt.method || "GET",
      url: opt.url,
      headers: Object.assign({
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/122 Mobile Safari/537.36",
      }, opt.headers || {}),
      data: opt.data,
      connectTimeout: opt.timeout || 8000,
      readTimeout: opt.timeout || 8000,
      responseType: "text",
      shouldEncodeUrlParams: false,
    });
    return { status: res.status, body: typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "") };
  }

  const form = (o) => Object.entries(o).map(([k, v]) =>
    encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");

  const post = (url, data, ref) => http({
    method: "POST", url, data: form(data),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(ref ? { Referer: ref, Origin: ref.replace(/\/$/, "") } : {}),
    },
  });

  /* ═══════════ محوّلات الراوتر ═══════════ */

  const Huawei = {
    kind: "huawei",
    async login(ip, user, pw) {
      const base = "http://" + ip;
      let tok = "";
      try {
        const t = await post(base + "/asp/GetRandCount.asp", {}, base + "/");
        tok = (t.body || "").trim().replace(/^\uFEFF/, "").replace(/^\+/, "");
      } catch (e) { /* بعض الموديلات لا تحتاجه */ }
      await post(base + "/login.cgi", {
        UserName: user, PassWord: btoa(pw), Language: "english", "x.X_HW_Token": tok,
      }, base + "/");
      // تحقق صارم: لا نقبل إلا إذا فتحت صفحة محمية فعلاً
      const idx = await http({ url: base + "/index.asp" });
      const low = (idx.body || "").toLowerCase();
      if (!idx.body || idx.body.length < 200) return false;
      for (const bad of ["login.cgi","userlogin","wrong password","invalid",
                         "incorrect","authentication fail","loginfail"])
        if (low.includes(bad)) return false;
      for (const p of ["/html/ssmp/deviceinfo/deviceinfo.asp",
                       "/html/bbsp/common/lancfg2.asp"]) {
        try {
          const r = await http({ url: base + p });
          const b = (r.body || "");
          if (b.length > 400 && !b.toLowerCase().slice(0, 400).includes("login"))
            return true;
        } catch (e) {}
      }
      return false;
    },
    async status(ip) {
      const base = "http://" + ip, out = { model: "Huawei ONT", fw: "-", wan_ip: "-", uptime: "-", mac: "-" };
      try {
        const h = (await http({ url: base + "/html/ssmp/deviceinfo/deviceinfo.asp" })).body;
        const g = (label) => {
          // يدعم صيغة الجدول: <td>Label</td><td>Value</td>  وأيضاً Label: Value
          const rx = new RegExp(label + "\\s*(?:<\\/[a-z]+>\\s*)?(?:<[^>]+>\\s*)*[:\\s]*([^<\\r\\n]{2,60})", "i");
          const m = h.match(rx);
          return m ? m[1].trim().replace(/^[:\s]+/, "") : null;
        };
        out.model = g("Device Type") || g("ProductName") || out.model;
        out.fw = g("Software Version") || g("SoftwareVersion") || out.fw;
        out.mac = g(/([0-9A-F]{2}(?::[0-9A-F]{2}){5})/i) || out.mac;
        const u = h.match(/(\d+)\s*day[s]?\s*(\d+):(\d+)/i);
        if (u) out.uptime = `${u[1]}d ${u[2]}:${u[3]}`;
      } catch (e) {}
      return out;
    },
    async devices(ip) {
      const base = "http://" + ip, out = [];
      for (const p of ["/html/bbsp/common/lancfg2.asp", "/html/bbsp/lancfg/lancfg.asp"]) {
        try {
          const h = (await http({ url: base + p })).body;
          const rx = /new\s+\w*Device\w*\((.*?)\)/gs;
          let m;
          while ((m = rx.exec(h))) {
            const parts = m[1].split(",").map((x) => x.trim().replace(/^["']|["']$/g, ""));
            const dip = parts.find((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x));
            const mac = parts.find((x) => /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(x));
            if (!mac) continue;
            const host = parts.find((x) => x && x !== dip && x !== mac && !/^\d+$/.test(x) && x.length < 40);
            out.push({ ip: dip || "-", mac: mac.toUpperCase(), host: host || dip || mac });
          }
          if (out.length) break;
        } catch (e) {}
      }
      return out;
    },
    async wifiGet(ip) {
      try {
        const h = (await http({ url: "http://" + ip + "/html/bbsp/wlanbasic/wlanbasic.asp" })).body;
        const m = h.match(/SSID["']?\s*[,:=]\s*["']([^"']{1,32})/);
        return { ssid: m ? m[1] : "" };
      } catch (e) { return {}; }
    },
    async _tok(ip, path) {
      const h = (await http({ url: "http://" + ip + path })).body;
      const m = h.match(/name="onttoken"[^>]*value="([^"]+)"/) || h.match(/onttoken\s*=\s*['"]([^'"]+)/);
      return m ? m[1] : "";
    },
    async wifiSet(ip, d) {
      const base = "http://" + ip;
      const t = await this._tok(ip, "/html/bbsp/wlanbasic/wlanbasic.asp");
      const p = { "x.X_HW_Token": t, onttoken: t };
      if (d.ssid) p["x.SSID"] = d.ssid;
      if (d.password) p["x.WPAKey"] = d.password;
      const r = await post(base + "/html/bbsp/wlanbasic/set.cgi?x=InternetGatewayDevice." +
        "LANDevice.1.WLANConfiguration.1&RequestFile=html/bbsp/wlanbasic/wlanbasic.asp", p, base + "/");
      return r.status >= 200 && r.status < 400;
    },
    async reboot(ip) {
      const base = "http://" + ip;
      const t = await this._tok(ip, "/html/ssmp/reset/reset.asp");
      const r = await post(base + "/html/ssmp/reset/set.cgi?x=InternetGatewayDevice." +
        "DeviceInfo&RequestFile=html/ssmp/reset/reset.asp",
        { "x.X_HW_Token": t, onttoken: t }, base + "/");
      return r.status >= 200 && r.status < 400;
    },
  };

  const ZTE = {
    kind: "zte",
    async _lt(ip) {
      const r = await http({ url: "http://" + ip + "/?_type=loginData&_tag=login_token" });
      const m = r.body.match(/<ajax_response_xml_root>(.*?)<\/ajax_response_xml_root>/s);
      return (m ? m[1] : r.body).trim();
    },
    async _sha256(s) {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
    },
    async login(ip, user, pw) {
      const base = "http://" + ip;
      await http({ url: base + "/" });
      await http({ url: base + "/?_type=loginData&_tag=login_entry" });
      const tok = await this._lt(ip);
      const hp = await this._sha256(pw + tok);
      const r = await post(base + "/?_type=loginData&_tag=login_entry",
        { action: "login", Username: user, Password: hp, _sessionTOKEN: tok }, base + "/");
      const lb = (r.body || "").toLowerCase();
      for (const bad of ["loginfail","login_fail","wrong","incorrect","error"])
        if (lb.includes(bad)) return false;
      const chk = await http({ url: base + "/?_type=menuData&_tag=devmgr_statusmgr_lua.lua" });
      return !!(chk.body && chk.body.length > 80 &&
                !chk.body.toLowerCase().slice(0, 200).includes("login"));
    },
    async status(ip) {
      const out = { model: "ZTE Router", fw: "-", wan_ip: "-", uptime: "-", mac: "-" };
      try {
        const x = (await http({ url: "http://" + ip + "/?_type=menuData&_tag=devmgr_statusmgr_lua.lua" })).body;
        const g = (k) => { const m = x.match(new RegExp(k + "[^>]*>([^<]+)<")); return m ? m[1] : null; };
        out.model = g("ModelName") || out.model;
        out.fw = g("SoftwareVer") || out.fw;
      } catch (e) {}
      return out;
    },
    async devices(ip) {
      const out = [];
      try {
        const x = (await http({ url: "http://" + ip + "/?_type=menuData&_tag=accessdev_landevs_lua.lua" })).body;
        for (const b of x.match(/<Instance>[\s\S]*?<\/Instance>/g) || []) {
          const g = (k) => { const m = b.match(new RegExp(k + "[^>]*>([^<]+)<")); return m ? m[1] : null; };
          const mac = g("MACAddress");
          if (mac) out.push({ ip: g("IPAddress") || "-", mac: mac.toUpperCase(), host: g("HostName") || "-" });
        }
      } catch (e) {}
      return out;
    },
    async wifiGet(ip) { return {}; },
    async wifiSet(ip, d) { return false; },
    async reboot(ip) {
      const base = "http://" + ip;
      const r = await post(base + "/?_type=menuData&_tag=devmgr_restartmgr_lua.lua",
        { IF_ACTION: "Restart", _sessionTOKEN: await this._lt(ip) }, base + "/");
      return r.status >= 200 && r.status < 400;
    },
  };

  /* ═══════════ أدوات الشبكة ═══════════ */

  async function reachable(ip, ms = 1200) {
    try {
      const r = await http({ url: "http://" + ip + "/", timeout: ms });
      return r.status > 0;
    } catch (e) { return false; }
  }

  async function detect(ip, user, pw) {
    if (!(await reachable(ip, 2000)))
      return { adapter: null, err: `الراوتر لا يستجيب على ${ip} — تحقق من العنوان` };
    let probe = "";
    try { probe = ((await http({ url: "http://" + ip + "/", timeout: 4000 })).body || "").toLowerCase(); } catch (e) {}
    const order = /zte|zxhn/.test(probe) ? [ZTE, Huawei] : [Huawei, ZTE];
    for (const A of order) {
      try { if (await A.login(ip, user, pw)) return { adapter: A, err: null }; } catch (e) {}
    }
    return { adapter: null, err: "فشل الدخول — تحقق من اسم المستخدم وكلمة السر" };
  }

  /* مسح الشبكة: نجرّب كل عنوان عبر الطلب الأصلي */
  async function scanSubnet(subnet, onProgress) {
    const found = [];
    const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
    let done = 0;
    const worker = async (queue) => {
      while (queue.length) {
        const ip = queue.shift();
        if (await reachable(ip, 700)) found.push(ip);
        if (onProgress) onProgress(++done, ips.length);
      }
    };
    const q = ips.slice();
    await Promise.all(Array.from({ length: 24 }, () => worker(q)));
    return found.sort((a, b) => +a.split(".")[3] - +b.split(".")[3]);
  }

  async function wanIp() {
    for (const u of ["https://api.ipify.org", "https://ifconfig.me/ip"]) {
      try {
        const r = await http({ url: u, timeout: 6000 });
        if (r.body && /^\d+\.\d+\.\d+\.\d+$/.test(r.body.trim())) return r.body.trim();
      } catch (e) {}
    }
    return "-";
  }

  async function speedtest(mb = 8) {
    const urls = [
      `https://speed.cloudflare.com/__down?bytes=${mb * 1000000}`,
      "https://proof.ovh.net/files/10Mb.dat",
    ];
    for (const u of urls) {
      try {
        const t0 = performance.now();
        const r = await fetch(u, { cache: "no-store" });
        const b = await r.blob();
        const dt = Math.max((performance.now() - t0) / 1000, 0.001);
        const dl = (b.size * 8) / dt / 1e6;
        if (dl > 0) return { download: +dl.toFixed(1), upload: null, ping: null };
      } catch (e) {}
    }
    return { error: "تعذّر الوصول لخوادم القياس" };
  }

  async function dnsBench() {
    const list = [
      ["Cloudflare", "1.1.1.1", "1.0.0.1", "https://1.1.1.1/dns-query?name=google.com"],
      ["Google", "8.8.8.8", "8.8.4.4", "https://dns.google/resolve?name=google.com"],
      ["Quad9", "9.9.9.9", "149.112.112.112", "https://dns.quad9.net:5053/dns-query?name=google.com"],
      ["AdGuard", "94.140.14.14", "94.140.15.15", "https://dns.adguard-dns.com/resolve?name=google.com"],
    ];
    const out = [];
    for (const [name, ip, ip2, url] of list) {
      let best = null;
      for (let i = 0; i < 2; i++) {
        try {
          const t0 = performance.now();
          await fetch(url, { headers: { accept: "application/dns-json" }, cache: "no-store" });
          const ms = +(performance.now() - t0).toFixed(1);
          if (best === null || ms < best) best = ms;
        } catch (e) {}
      }
      out.push({ name, ip, ip2, ms: best, loss: best === null ? 100 : 0 });
    }
    out.sort((a, b) => (a.ms ?? 9999) - (b.ms ?? 9999));
    return out;
  }

  /* ═══════════ ربط الواجهة ═══════════ */
  const S = { ad: null, ip: "192.168.1.1", kind: "scan" };
  const $ = (id) => document.getElementById(id);

  function badge(txt, cls) {
    const c = $("modeChip");
    if (c) { c.textContent = txt; c.className = "chip " + (cls || ""); }
  }

  function hook() {
    /* الدخول الحقيقي — لا يفتح التطبيق إلا بعد تحقق فعلي */
    window.__realLogin = async function (ipArg) {
      const ip = ipArg || $("ip")?.value || "192.168.100.1";
      const ru = $("rUser")?.value || $("usr")?.value || "admin";
      const rp = $("rPass")?.value || $("pwd")?.value || "admin";
      S.ip = ip;

      window.clearLoginError?.();
      window.setLoginBusy?.(true, "جاري الاتصال بالراوتر...");
      badge("⏳ جاري الاتصال...", "");

      let adapter = null, err = null;
      try { ({ adapter, err } = await detect(ip, ru, rp)); }
      catch (e) { err = e.message || String(e); }

      window.setLoginBusy?.(false);
      S.ad = adapter; S.kind = adapter ? adapter.kind : "scan";

      if (adapter) {
        /* ✅ نجح — نفتح التطبيق */
        window.VERIFIED = true;
        if (window.DEV) window.DEV.length = 0;
        window.openApp?.();
        badge("🟢 LIVE · " + S.kind.toUpperCase(), "on");
        window.toast?.("✅ تم تسجيل الدخول للراوتر", "ok");
        pull();
        window.scanDevices?.(true);
      } else {
        /* ❌ فشل — نبقى في شاشة الدخول */
        badge("🔴 غير متصل", "off");
        window.loginError?.("❌ فشل تسجيل الدخول للراوتر",
          err || "تعذّر الاتصال",
          "تأكد من:<br>" +
          "• <b>عنوان الراوتر</b> — جرّب <b>192.168.100.1</b> أو <b>192.168.1.1</b><br>" +
          "• <b>اسم المستخدم وكلمة السر</b> المطبوعان خلف الراوتر<br>" +
          "• لراوترات WE: <b>telecomadmin / admintelecom</b><br>" +
          "• أنك متصل بواي فاي الراوتر (وليس بيانات الجوال)");
      }
    };

    /* تحديث البيانات */
    async function pull() {
      try {
        const st = S.ad ? await S.ad.status(S.ip) : {};
        const wan = st.wan_ip && st.wan_ip !== "-" ? st.wan_ip : await wanIp();
        const rows = document.querySelectorAll("#p-home .info-tbl td");
        if (rows.length >= 6) {
          rows[0].textContent = st.model || "فحص الشبكة";
          rows[1].textContent = S.ip;
          rows[2].textContent = wan;
          rows[4].textContent = st.uptime || "-";
        }
        if ($("tIp")) $("tIp").textContent = S.ip;
        const c = $("connChip");
        if (c) { c.className = "chip on"; c.textContent = "🟢 متصل"; }
      } catch (e) {}
      if (S.ad) {
        try {
          const d = await S.ad.devices(S.ip);
          if (d.length && window.DEV) {
            window.DEV.length = 0;
            d.forEach((x) => window.DEV.push({
              ic: "💻", ar: x.host, en: x.host, ip: x.ip, mac: x.mac,
              use: 0, sig: -50, st: "Working", up: "NotSet", dn: "NotSet",
              mf: false, blk: false,
            }));
            window.renderAll?.();
          }
        } catch (e) {}
      }
    }
    window.__pull = pull;

    /* فحص الأجهزة */
    window.scanDevices = async function (silent) {
      window.toast?.("🔍 جاري فحص الشبكة...", "warn");
      let list = [];
      if (S.ad) { try { list = await S.ad.devices(S.ip); } catch (e) {} }
      if (!list.length) {
        const sub = S.ip.split(".").slice(0, 3).join(".");
        const ips = await scanSubnet(sub);
        list = ips.map((ip) => ({ ip, mac: "—", host: ip === S.ip ? "Router" : ip }));
      }
      window.DEV.length = 0;
      list.forEach((x) => window.DEV.push({
        ic: x.ip === S.ip ? "🖧" : "💻", ar: x.host, en: x.host,
        ip: x.ip, mac: x.mac, use: 0, sig: -50, st: "Working",
        up: "NotSet", dn: "NotSet", mf: false, blk: false,
      }));
      window.renderAll?.();
      if (!silent) window.toast?.(`✅ وجدت ${list.length} جهاز`, "ok");
    };

    /* قياس السرعة */
    window.runSpeed = async function () {
      const btn = $("spBtn"); if (!btn || btn.dataset.b) return;
      btn.dataset.b = 1; btn.textContent = "⏳ جاري القياس...";
      let v = 0;
      const iv = setInterval(() => {
        v = Math.min(v + Math.random() * 7, 92);
        $("spNum").textContent = v.toFixed(1);
        $("spBar").style.width = v + "%";
      }, 180);
      const r = await speedtest(8);
      clearInterval(iv);
      if (r.error) { window.toast?.("⚠ " + r.error, "bad"); }
      else {
        $("spNum").textContent = r.download.toFixed(1);
        $("spBar").style.width = Math.min(100, r.download) + "%";
        $("spDl").innerHTML = r.download.toFixed(1) + " <small>Mbps</small>";
        const q = $("spQ");
        q.textContent = r.download > 40 ? "ممتازة" : r.download > 15 ? "جيدة" : "ضعيفة";
        q.style.color = r.download > 40 ? "var(--ok)" : r.download > 15 ? "var(--warn)" : "var(--bad)";
        window.toast?.("✅ " + r.download.toFixed(1) + " Mbps", "ok");
      }
      btn.dataset.b = ""; btn.innerHTML = "▶ ابدأ الاختبار";
    };

    /* أفضل DNS */
    window.bestDns = async function () {
      window.toast?.("⏳ جاري القياس...", "warn");
      const r = await dnsBench();
      $("dnsResults").innerHTML = r.map((d, i) =>
        `<div class="listitem"><div class="avatar">${i === 0 ? "🏆" : i + 1}</div>
         <div style="flex:1;min-width:150px"><div class="nm">${d.name}</div>
         <div class="mt">${d.ip} • ${d.ip2}</div></div>
         <span class="tag ${d.ms == null ? "t-bad" : d.ms < 60 ? "t-ok" : "t-warn"} mono">
         ${d.ms == null ? "timeout" : d.ms + " ms"}</span>
         <button class="btn sm ghost" onclick="useDns('${d.ip}','${d.ip2}')">استخدم</button></div>`).join("");
      const b = r.find((x) => x.ms != null);
      if (b) { $("dns1").value = b.ip; $("dns2").value = b.ip2; window.toast?.("🏆 " + b.name, "ok"); }
    };

    /* تشخيص */
    window.runDiag = async function () {
      window.toast?.("⏳ جاري التشخيص...", "warn");
      const gw = await reachable(S.ip, 2500);
      const wan = await wanIp();
      const rows = [
        ["حالة الاتصال", wan !== "-" ? "Connected" : "Disconnected", wan !== "-" ? "var(--ok)" : "var(--bad)"],
        ["الـIP الخارجي", wan, wan !== "-" ? "var(--txt)" : "var(--muted)"],
        ["الراوتر", gw ? "يستجيب ✔" : "لا يستجيب", gw ? "var(--ok)" : "var(--bad)"],
        ["الدخول للراوتر", S.ad ? "ناجح ✔" : "غير مسجّل", S.ad ? "var(--ok)" : "var(--warn)"],
      ];
      $("dgBody").innerHTML = rows.map((r) =>
        `<tr><th>${r[0]}</th><td class="mono" style="color:${r[2]}">${r[1]}</td></tr>`).join("");
      const n = $("dgNote");
      let m, c;
      if (!gw) { m = "❌ الراوتر لا يستجيب — تأكد أنك متصل بالواي فاي وأن العنوان صحيح."; c = "note r"; }
      else if (wan === "-") { m = "❌ الشبكة سليمة لكن لا يوجد إنترنت — المشكلة من مزود الخدمة."; c = "note r"; }
      else { m = "✅ كل شيء سليم — الشبكة والإنترنت يعملان."; c = "note g"; }
      n.textContent = m; n.className = c;
      window.toast?.("✅ اكتمل التشخيص", "ok");
    };

    /* تغيير الواي فاي */
    const _apply = window.apply;
    window.apply = async function (w) {
      if (w !== "wifi" || !S.ad) return _apply && _apply(w);
      window.toast?.("⏳ جاري التطبيق...", "warn");
      const ok = await S.ad.wifiSet(S.ip, { ssid: $("ssid").value, password: $("wpass").value });
      window.toast?.(ok ? "✅ تم تطبيق الإعدادات على الراوتر" : "⚠ الراوتر رفض التعديل", ok ? "ok" : "warn");
    };

    /* إعادة التشغيل */
    window.askReboot = function () {
      window.modal?.("إعادة تشغيل الراوتر",
        S.ad ? "سيتم إرسال أمر حقيقي للراوتر. متابعة؟" : "لست متصلاً بالراوتر — سجّل الدخول أولاً.",
        async () => {
          if (!S.ad) return window.toast?.("⚠ غير متصل", "bad");
          const ok = await S.ad.reboot(S.ip);
          window.toast?.(ok ? "🔄 تم إرسال الأمر" : "⚠ فشل", ok ? "warn" : "bad");
        });
    };

    /* كشف الراوتر تلقائياً */
    window.autoDetect = async function () {
      window.toast?.("🔍 جاري البحث...", "warn");
      const cands = ["192.168.1.1", "192.168.100.1", "192.168.0.1", "192.168.8.1", "10.0.0.1"];
      for (const ip of cands) {
        if (await reachable(ip, 900)) {
          $("ip").value = ip;
          window.toast?.("✅ وجدت الراوتر: " + ip, "ok");
          return;
        }
      }
      window.toast?.("⚠ لم أجد راوتراً — أدخل العنوان يدوياً", "warn");
    };
  }

  function boot() {
    if (!isNative()) return;           // على الكمبيوتر نترك live.js يعمل
    hook();
    badge("📱 APK — جاهز", "on");
    /* لافتة الحالة أعلى شاشة الدخول */
    const bar = document.getElementById("engineBar");
    if (bar) {
      bar.style.background = "rgba(34,197,94,.14)";
      bar.style.borderColor = "rgba(34,197,94,.5)";
      bar.innerHTML = '<b style="color:var(--ok)">🟢 نسخة APK — تتصل بالراوتر مباشرة</b>' +
        '<br><span style="color:var(--muted)">أدخل بيانات راوترك واضغط اتصل</span>';
    }
    const h = document.querySelector("#login .hint");
    if (h) h.innerHTML = "لا تحتاج بايثون ولا خادم — التطبيق يتصل بالراوتر مباشرة.";
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.RouterEasyNative = { http, detect, scanSubnet, speedtest, dnsBench, isNative };
})();
