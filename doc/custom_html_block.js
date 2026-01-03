/* ==== إدارة الملفات - دعم Child Doctypes + إظهار الملفات المشتركة فقط لغير الإدمن ==== */
(function(){
  // Polyfill: Promise.prototype.finally (لبعض البيئات التي لا تدعمه)
  try{
    if (typeof Promise!=='undefined' && !Promise.prototype.finally){
      Promise.prototype.finally = function(onFinally){
        var p=this;
        var fn = (typeof onFinally==='function') ? onFinally : function(){};
        return p.then(function(v){ try{ fn(); }catch(e){} return v; }, function(err){ try{ fn(); }catch(e){} throw err; });
      };
    }
  }catch(e){ /* ignore */ }
  var REPORT_NAME = 'تقرير الملفات 2';
  var LIMITS = { near: 24, all: 24, exp: 24, attach: 24 };
  var ALL_FILES_TTL_MS = 15 * 1000;

  // <<<<<< لو أسماء الجداول الفرعية مختلفة عندك عدّلها هنا >>>>>>
  var CHILD_DOCTYPES = ['Customer Attachment', 'Customer Attachments'];

  var ADMIN_ROLES = ['Administrator', 'System Manager', 'ادمن'];
  function hasAdminRole(){ try{ return ADMIN_ROLES.some(function(r){ return frappe.user.has_role(r); }); }catch(e){ return false; } }

  // ===== إعدادات (محفوظة محليًا – افتراضاتها مفعّلة لغير الإدمن) =====
  var SETTINGS_KEY = 'files_block_settings_v1';
  function loadSettings(){
    var def = {
      apply_to_admin: false,
      non_admin: {
        show_add_file: true,
        show_copy_all_links: true,
        show_share_customer: false,
        show_view_customer_shares: false,
        show_share_all_files: false,
        show_clear_cust_shares: false,
        show_file_share: true,
        show_file_shares: true,
        show_uploader: false
      }
    };
    try{
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return def;
      var parsed = JSON.parse(raw);
      return {
        apply_to_admin: !!(parsed.apply_to_admin),
        non_admin: Object.assign({}, def.non_admin, parsed.non_admin||{})
      };
    }catch(e){ return def; }
  }
  function saveSettings(obj){ try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj||{})); }catch(e){} }
  var SETTINGS = loadSettings();

  var root = root_element;

  /* ============ CSS ============ */
  var style = document.createElement('style');
  style.textContent = `
    .rpt-toolbar{display:flex;gap:6px;align-items:center;margin-bottom:8px}
    .rpt-search{flex:1;padding:6px 10px;border:1px solid #e5e7eb;border-radius:10px;font-size:12px}
    .rpt-btn{padding:6px 10px;border-radius:10px;border:1px solid #e5e7eb;background:#f8fafc;cursor:pointer;font-size:12px}
    .rpt-errors{display:none;padding:8px;border:1px solid #fecaca;background:#fff5f5;color:#7f1d1d;border-radius:10px;margin-bottom:8px;font-size:12px}

    .rpt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:14px}
    .card{border:1px solid #e5e7eb;border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:box-shadow .15s}
    .card:hover{box-shadow:0 6px 14px rgba(0,0,0,.08)}
    .card.near-first{position:relative;box-shadow:0 10px 22px rgba(245,158,11,.10)}
    .card.near-first::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:linear-gradient(#fbbf24,#f59e0b)}

    .head{display:flex;gap:10px;align-items:center;padding:12px;border-bottom:1px solid #eef2f7;background:#fafbff}
    .cid a{display:inline-block;padding:2px 10px;border:1px dashed #cbd5e1;border-radius:10px;text-decoration:none;color:#334155;font-weight:600;font-size:12px}
    .cname{font-weight:700;color:#0f172a;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}

    .global-actions{display:flex;gap:6px;flex-wrap:wrap}
    .btn-sm{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;cursor:pointer;font-size:11px}
    .btn-sm .ico{font-size:14px;line-height:1}

    .folders{display:flex;gap:10px;padding:10px;border-bottom:1px solid #f1f5f9}
    .folder{flex:1;display:flex;align-items:center;gap:12px;border:1px solid #e5e7eb;border-radius:12px;padding:10px;cursor:pointer;transition:.15s;background:#fff}
    .folder:hover{background:#f8fafc}
    .folder .ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900}
    .f-near .ico{background:#fde68a} .f-all .ico{background:#bbf7d0} .f-exp .ico{background:#fecaca}
    .folder .title{font-size:12px;color:#475569} .folder .count{font-size:15px;font-weight:800;color:#0f172a}

    .sec{margin:14px;border:1px dashed #e5e7eb;border-radius:12px}
    .sec[hidden]{display:none}
    .sec-hd{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8fafc;border-bottom:1px dashed #e5e7eb;font-size:12px;color:#475569}
    .sec-hd .sec-actions{display:flex;gap:6px;flex-wrap:wrap}
    .settings-note{font-size:10px;color:#64748b}

    .sec-grid{padding:12px;display:grid;grid-template-columns:repeat(3, minmax(0,1fr));gap:20px;margin-bottom:16px;align-items:stretch}
    @media (max-width:1024px){.sec-grid{grid-template-columns:repeat(2, minmax(0,1fr))}}
    @media (max-width:640px){.sec-grid{grid-template-columns:repeat(1, minmax(0,1fr))}}

    .more-btn{margin:8px 12px;padding:6px 10px;border:1px solid #e5e7eb;background:#fff;border-radius:10px;cursor:pointer;font-size:11px}
    .muted{color:#94a3b8;font-size:12px;padding:10px 12px}

    .sec-all-files .sec-hd{background:#fff7ed}
    .sec-all-files .count-pill{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #fed7aa;background:#ffedd5;font-size:11px;color:#9a3412;margin-right:6px}

    .chip{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .chip.shared-direct{background:#f5f3ff;border-color:#c4b5fd}

    .chip a.btn{display:block;width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:10px;font-size:12px;font-weight:500;text-decoration:none;color:#1e293b;background:#f8fafc;overflow:hidden;text-overflow:ellipsis;text-align:center;line-height:1.25;white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3}
    .chip:hover a.btn,.chip:focus-within a.btn{-webkit-line-clamp:unset;line-clamp:unset}

    .chip .note{font-size:10px;color:#64748b;text-align:center}
    .chip .act{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
    .chip .act .btn{flex:1;text-align:center;padding:5px 8px;border:1px solid #e5e7eb;border-radius:10px;background:#f1f5f9;cursor:pointer;font-size:11px;white-space:nowrap}

    .badge-note{font-size:10px;color:#64748b;margin-top:-4px;text-align:center}
  `;
  root.appendChild(style);

  /* ============ UI ============ */
  var box = document.createElement('div');
  box.innerHTML =
    '<div class="rpt-toolbar" dir="rtl">'+
      '<input class="rpt-search" placeholder="ابحث باسم العميل أو الـ ID…" autocomplete="off" />'+
      '<button class="rpt-btn">تحديث</button>'+
    '</div>'+
    '<div class="rpt-errors"></div>'+
    '<div class="rpt-grid" dir="rtl"></div>';
  root.appendChild(box);

  var grid   = box.querySelector('.rpt-grid');
  var search = box.querySelector('.rpt-search');
  var btn    = box.querySelector('.rpt-btn');
  var errBox = box.querySelector('.rpt-errors');

  ['keydown','keyup','keypress'].forEach(function(ev){
    search.addEventListener(ev, function(e){
      e.stopPropagation(); e.stopImmediatePropagation();
      if (e.key==='Enter'||e.key==='/') e.preventDefault();
    }, true);
  });

  /* ============ State/Utils ============ */
  var ROWS=[], COLMETA=[], MAP={};
  var _ALL_FILES_CACHE = new Map(); // key: ADM_/USR_ + customer_id -> { items, at }
  // مجموعة العملاء المسموحين للمستخدم الحالي (لغير الإدمن)
  var ALLOWED_CUSTOMERS = null;
  // أسماء العرض للعملاء (customer_name) لمطابقة تقارير تُظهر اسم العميل بدل الـID
  var ALLOWED_CUSTOMERS_DISPLAY = null;

  function debounce(fn, ms){ var t; return function(){ var a=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,a); }, ms||250); }; }
  function norm(s){ return String(s||'').split(':')[0].replace(/\s+/g,' ').trim().toLowerCase(); }
  function safeText(s){ return frappe.utils.escape_html(String(s==null?'':s)); }
  function clearError(){ errBox.style.display='none'; errBox.textContent=''; }
  function showError(msg){ errBox.style.display='block'; errBox.textContent = msg; }
  function findCol(hints){
    var H=hints.map(function(h){return h.toLowerCase();});
    for (var i=0;i<COLMETA.length;i++){
      var c=COLMETA[i], L=norm(c.label), F=norm(c.fieldname);
      for (var j=0;j<H.length;j++){ var h=H[j]; if (L.indexOf(h)>-1 || F.indexOf(h)>-1) return c; }
    } return null;
  }
  function getCell(row,col){
    if (!col) return '';
    if (Array.isArray(row)) return (row[col._idx]!=null? row[col._idx] : '');
    if (row && typeof row==='object'){
      if (col.fieldname && (col.fieldname in row)) return row[col.fieldname]||'';
      if (col.label && (col.label in row)) return row[col.label]||'';
      var key = Object.keys(row).find(function(k){ return norm(k)===norm(col.label); });
      if (key) return row[key]||'';
    }
    return '';
  }
  function countLinks(html){
    if (!html) return 0;
    return (String(html).match(/<(a|button)\s/gi)||[]).length + (String(html).match(/<span\b/gi)||[]).length;
  }
  function absURL(file_url){
    if (!file_url) return '';
    if (/^https?:\/\//i.test(file_url)) return file_url;
    return window.location.origin + file_url;
  }
  function copyToClipboard(text, toast){
    try{
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){
          if (toast) frappe.show_alert({message:toast,indicator:'green'});
        }).catch(function(){ prompt('انسخ الرابط يدويًا:', text); });
      }else{ prompt('انسخ الرابط يدويًا:', text); }
    }catch(e){ prompt('انسخ الرابط يدويًا:', text); }
  }
  function userFullName(user){
    if (!user) return '';
    try{
      var info = frappe.user_info(user) || {};
      return info.full_name || info.fullname || info.first_name || user;
    }catch(e){ return user; }
  }
  function chunk(arr, n){ var out=[]; for(var i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; }

  /* ============ إعدادات الإدمن ============ */
  function openSettingsDialog(){
    var s = loadSettings();
    var d = new frappe.ui.Dialog({
      title: 'إعدادات الواجهة (تُطبق على غير الإدمن، ويمكن معاينتها على الإدمن)',
      size: 'large',
      fields: [
        { fieldname:'apply_to_admin', label:'طبّق هذه الإعدادات عليَّ أيضًا (للمعاينة)', fieldtype:'Check', default:s.apply_to_admin },

        { fieldtype:'Section Break', label:'أزرار الهيدر (على مستوى العميل)' },
        { fieldname:'show_add_file', label:'إظهار زر "إضافة ملف"', fieldtype:'Check', default:s.non_admin.show_add_file },
        { fieldname:'show_copy_all_links', label:'إظهار "نسخ روابط كل الملفات"', fieldtype:'Check', default:s.non_admin.show_copy_all_links },
        { fieldname:'show_share_customer', label:'إظهار "مشاركة العميل"', fieldtype:'Check', default:s.non_admin.show_share_customer },
        { fieldname:'show_view_customer_shares', label:'إظهار "مشاركات العميل"', fieldtype:'Check', default:s.non_admin.show_view_customer_shares },
        { fieldname:'show_share_all_files', label:'إظهار "مشاركة كل الملفات"', fieldtype:'Check', default:s.non_admin.show_share_all_files },
        { fieldname:'show_clear_cust_shares', label:'إظهار "إلغاء كل المشاركات"', fieldtype:'Check', default:s.non_admin.show_clear_cust_shares },

        { fieldtype:'Section Break', label:'أزرار الملف' },
        { fieldname:'show_file_share', label:'إظهار زر "مشاركة" على الملف', fieldtype:'Check', default:s.non_admin.show_file_share },
        { fieldname:'show_file_shares', label:'إظهار زر "المشاركات" على الملف', fieldtype:'Check', default:s.non_admin.show_file_shares },
        { fieldname:'show_uploader', label:'إظهار "تم الرفع بواسطة"', fieldtype:'Check', default:s.non_admin.show_uploader },

        { fieldtype:'HTML', fieldname:'hint', options:'<div class="settings-note">بعد الحفظ، التغييرات تتطبق فورًا بدون تحديث.</div>' }
      ],
      primary_action_label: 'حفظ',
      primary_action: function(v){
        s.apply_to_admin = !!v.apply_to_admin;
        s.non_admin = {
          show_add_file: !!v.show_add_file,
          show_copy_all_links: !!v.show_copy_all_links,
          show_share_customer: !!v.show_share_customer,
          show_view_customer_shares: !!v.show_view_customer_shares,
          show_share_all_files: !!v.show_share_all_files,
          show_clear_cust_shares: !!v.show_clear_cust_shares,
          show_file_share: !!v.show_file_share,
          show_file_shares: !!v.show_file_shares,
          show_uploader: !!v.show_uploader
        };
        saveSettings(s); SETTINGS = s;
        frappe.show_alert({message:'تم الحفظ وتطبيق الإعدادات فورًا', indicator:'green'});
        d.hide();
        render();
      }
    });
    d.show();
  }
  function isAdminForUI(){ var realAdmin = hasAdminRole(); return realAdmin && !SETTINGS.apply_to_admin; }

  function buildHeadHTML(id, name){
    var realAdmin = hasAdminRole();
    var adminForUI = isAdminForUI();
    var S = SETTINGS.non_admin;
    function btn(cond, cls, ico, txt){ return cond?('<button class="btn-sm '+cls+'"><span class="ico">'+ico+'</span><span>'+txt+'</span></button>') : ''; }
    return ''+
      '<div class="cid"><a href="#Form/Customer/'+encodeURIComponent(String(id))+'" target="_blank" title="فتح نموذج العميل">'+ safeText(id) +'</a></div>'+
      '<div class="cname" title="'+ safeText(name) +'">'+ safeText(name) +'</div>'+
      '<div class="global-actions">'+
        btn(adminForUI || S.show_add_file, 'add-file', '➕', 'إضافة ملف')+
        btn(adminForUI || S.show_copy_all_links, 'copy-all-links', '🔗', 'نسخ روابط كل الملفات')+
        btn(adminForUI || S.show_share_customer, 'share-customer', '👤', 'مشاركة العميل')+
        btn(adminForUI || S.show_view_customer_shares, 'view-customer-shares', '👁️', 'مشاركات العميل')+
        btn(adminForUI || S.show_share_all_files, 'share-all-files', '👥', 'مشاركة كل الملفات')+
        btn(adminForUI || S.show_clear_cust_shares, 'clear-cust-shares', '🧹', 'إلغاء كل المشاركات')+
        (realAdmin ? btn(true, 'open-settings', '⚙️', 'إعدادات') : '')+
        btn(true, 'toggle-all', '📁', 'عرض كل ملفات العميل')+
      '</div>';
  }

  /* ===== Helpers: File name resolve ===== */
  function resolveFileNameByUrl(file_url){
    if (!file_url) return Promise.reject('no url');
    return frappe.call({
      method:'frappe.client.get_list',
      args:{ doctype:'File', fields:['name'], filters:[ ['file_url','=', file_url] ], limit_page_length:1 }
    }).then(function(r){
      var rows=(r&&r.message)||[];
      if (!rows.length) throw 'not found';
      return rows[0].name;
    });
  }
  function ensureDocName(file){
    if (file && file.name) return Promise.resolve(file.name);
    if (file && file.file_url) return resolveFileNameByUrl(file.file_url);
    return Promise.reject('no identifier');
  }

  // === NEW: جلب معلومات المشاركة لعدد من الملفات دفعة واحدة (للتمييز في أقسام التقرير) ===
  function getShareInfoForFiles(file_names){
    if (!file_names || !file_names.length) return Promise.resolve(new Map());
    return frappe.call({
      method:'frappe.client.get_list',
      args:{
        doctype:'DocShare',
        fields:['name','share_name','read','write','share','everyone','user'],
        filters:[ ['share_doctype','=','File'], ['share_name','in', file_names] ],
        limit_page_length: 5000
      }
    }).then(function(r){
      var map=new Map(); var rows=(r&&r.message)||[];
      rows.forEach(function(s){
        var arr=map.get(s.share_name)||[];
        arr.push(s);
        map.set(s.share_name, arr);
      });
      return map;
    });
  }

  /* ====== Chip ====== */
  function makeChip(file, opts){
    opts = opts || {};
    var adminForUI = isAdminForUI();
    var S = SETTINGS.non_admin;

    var canShare     = adminForUI || S.show_file_share;
    var showShares   = adminForUI || S.show_file_shares;
    var showUploader = adminForUI || S.show_uploader;

    var extraClass = opts.extraClass || '';
    var noteExtra  = opts.note || '';

    var wrap=document.createElement('div'); wrap.className='chip '+extraClass;

    var a=document.createElement('a'); a.className='btn';
    if (file.file_url){ a.href=file.file_url; a.target='_blank'; a.rel='noopener'; }
    else { a.removeAttribute('href'); a.style.pointerEvents='none'; a.title='لا يوجد رابط ملف'; }
    a.textContent = file.file_name || (file.file_url? file.file_url.split('/').pop() : file.name || 'ملف');

    var note=document.createElement('div'); note.className='note';
    var uploaderTxt = (showUploader && file.owner) ? ('تم الرفع بواسطة: '+ userFullName(file.owner)) : '';
    var finalNote = [noteExtra, uploaderTxt].filter(Boolean).join(' • ');
    if (finalNote){ note.textContent = finalNote; } else { note.style.display='none'; }

    var act=document.createElement('div'); act.className='act';

    var viewBtn=document.createElement('button'); viewBtn.className='btn'; viewBtn.textContent='عرض';
    viewBtn.onclick=function(){ if (file.file_url) window.open(file.file_url,'_blank','noopener'); };
    if (!file.file_url){ viewBtn.disabled=true; viewBtn.title='لا يوجد رابط للعرض'; }
    act.appendChild(viewBtn);

    var linkBtn=document.createElement('button'); linkBtn.className='btn'; linkBtn.textContent='نسخ الرابط';
    linkBtn.onclick=function(){
      if (!file.file_url){ frappe.msgprint('لا يوجد رابط.'); return; }
      copyToClipboard(absURL(file.file_url), 'تم نسخ الرابط' + (file.is_private?' (خاص)':''));
    };
    act.appendChild(linkBtn);

    function handleShare(){ 
      ensureDocName(file).then(function(docname){ shareFileDialog(docname); })
      .catch(function(){ frappe.msgprint('تعذر تحديد هذا الملف للمشاركة (لا يوجد رقم المستند).'); });
    }
    function handleViewShares(){
      ensureDocName(file).then(function(docname){ showSharesDialog('File', docname); })
      .catch(function(){ frappe.msgprint('تعذر إظهار المشاركات لهذا الملف.'); });
    }

    if (canShare){
      var shareBtn=document.createElement('button'); shareBtn.className='btn'; shareBtn.textContent='مشاركة';
      shareBtn.onclick=handleShare; act.appendChild(shareBtn);
    }
    if (showShares){
      var sharesBtn=document.createElement('button'); sharesBtn.className='btn'; sharesBtn.textContent='المشاركات';
      sharesBtn.onclick=handleViewShares; act.appendChild(sharesBtn);
    }

    wrap.appendChild(a); wrap.appendChild(note); wrap.appendChild(act);
    return wrap;
  }

  function makeSection(title){
    var sec=document.createElement('div'); sec.className = 'sec'; sec.hidden = true;
    sec.innerHTML =
      '<div class="sec-hd"><span>'+safeText(title)+'</span><div class="sec-actions"></div></div>'+
      '<div class="sec-grid"></div>'+
      '<button class="more-btn" hidden>عرض الكل</button>';
    return sec;
  }

  function toggleSection(card, key){
    var map={ near:card.querySelector('.sec-near'), all:card.querySelector('.sec-all'), exp:card.querySelector('.sec-exp') };
    Object.keys(map).forEach(function(k){
      if (!map[k]) return;
      if (k===key){
        var wasHidden=map[k].hidden; map[k].hidden=!map[k].hidden;
        if (wasHidden && !map[k].hidden){
          var mb=map[k].querySelector('.more-btn');
          if (mb && !mb.hidden && /عرض الكل/.test(mb.textContent)) mb.click();
        }
      } else map[k].hidden=true;
    });
  }
  function expandAllSections(card){
    ['.sec-near','.sec-all','.sec-exp'].forEach(function(sel){
      var s=card.querySelector(sel); if (!s) return;
      s.hidden=false; var more=s.querySelector('.more-btn');
      if (more && !more.hidden && /عرض الكل/.test(more.textContent)) more.click();
    });
  }
  function collapseAllSections(card){
    ['.sec-near','.sec-all','.sec-exp'].forEach(function(sel){
      var s=card.querySelector(sel); if (s) s.hidden=true;
    });
  }

  function renderFolderBar(card,counts){
    var folders=document.createElement('div'); folders.className='folders';
    [{key:'near',cls:'f-near',title:'ملفات ستنتهي',count:counts.near},
     {key:'all', cls:'f-all', title:'الملفات السارية',count:counts.all},
     {key:'exp', cls:'f-exp', title:'الملفات المنتهية',count:counts.exp}]
    .forEach(function(d){
      var f=document.createElement('div'); f.className='folder '+d.cls;
      f.innerHTML='<div class="ico">📁</div><div class="meta"><div class="title">'+d.title+'</div><div class="count">'+d.count+'</div></div>';
      f.addEventListener('click', function(){ toggleSection(card,d.key); });
      folders.appendChild(f);
    });
    return folders;
  }

  /* ============ All Files ============ */
  // عملاء مشاركين للمستخدم الحالي (DocShare على Customer)
  function getSharedCustomerIdsForCurrentUser(){
    var u = frappe.session.user;
    return Promise.all([
      frappe.call({ method:'frappe.client.get_list',
        args:{ doctype:'DocShare', fields:['share_name'],
               filters:[ ['share_doctype','=','Customer'], ['user','=', u] ], limit_page_length:5000 }
      }),
      frappe.call({ method:'frappe.client.get_list',
        args:{ doctype:'DocShare', fields:['share_name'],
               filters:[ ['share_doctype','=','Customer'], ['everyone','=', 1] ], limit_page_length:5000 }
      })
    ]).then(function(res){
      var a=(res[0]&&res[0].message)||[], b=(res[1]&&res[1].message)||[];
      var set=new Set(); a.concat(b).forEach(function(x){ if(x&&x.share_name) set.add(String(x.share_name)); });
      return Array.from(set);
    });
  }

  // عملاء مسموحون للمستخدم الحالي: DocShare على Customer أولًا، ثم استنباط من الملفات المشتركة
  function getAllowedCustomersForCurrentUser(){
    return getSharedCustomerIdsForCurrentUser().then(function(ids){
      ids = ids || [];
      if (ids.length) return ids;
      // fallback: استنباط العملاء من الملفات المشتركة مباشرة على Customer
      return getSharedFileNamesForCurrentUser()
        .then(fetchFilesByNames)
        .then(function(files){
          var set=new Set();
          (files||[]).forEach(function(f){
            if (f && f.attached_to_doctype==='Customer' && f.attached_to_name){
              set.add(String(f.attached_to_name));
            }
          });
          return Array.from(set);
        });
    });
  }

  // جلب أسماء العرض (customer_name) للعملاء من قائمة الـID المسموح بها
  function fetchCustomerDisplayNames(ids){
    if (!ids || !ids.length) return Promise.resolve([]);
    return frappe.call({
      method:'frappe.client.get_list',
      args:{ doctype:'Customer', fields:['name','customer_name'], filters:[ ['name','in', ids] ], limit_page_length:5000 }
    }).then(function(r){
      var rows=(r&&r.message)||[];
      return rows.map(function(it){ return it && it.customer_name ? String(it.customer_name) : null; }).filter(Boolean);
    }).catch(function(e){ console.error('fetchCustomerDisplayNames failed', e); return []; });
  }

  // 1) أسماء ملفات مشتركة لليوزر الحالي (أو Everyone)
  function getSharedFileNamesForCurrentUser(){
    var u = frappe.session.user;
    return Promise.all([
      frappe.call({ method:'frappe.client.get_list',
        args:{ doctype:'DocShare', fields:['share_name'],
               filters:[ ['share_doctype','=','File'], ['user','=', u] ], limit_page_length:5000 }
      }),
      frappe.call({ method:'frappe.client.get_list',
        args:{ doctype:'DocShare', fields:['share_name'],
               filters:[ ['share_doctype','=','File'], ['everyone','=', 1] ], limit_page_length:5000 }
      })
    ]).then(function(res){
      var a=(res[0]&&res[0].message)||[], b=(res[1]&&res[1].message)||[];
      var set=new Set(); a.concat(b).forEach(function(x){ if(x&&x.share_name) set.add(x.share_name); });
      return Array.from(set);
    });
  }

  // 2) هات صفوف الجداول الفرعية من داخل مستند Customer (بدون get_list على Child)
  function getChildRowsForCustomer(customer_id){
    return frappe.call({
      method: 'frappe.client.get',
      args: { doctype: 'Customer', name: String(customer_id) }
    })
    .then(function(r){
      var doc = r && r.message;
      var map = {}; CHILD_DOCTYPES.forEach(function(dt){ map[dt] = new Set(); });
      if (!doc) return map;

      Object.keys(doc).forEach(function(k){
        var v = doc[k];
        if (Array.isArray(v)){
          v.forEach(function(row){
            if (row && row.doctype && CHILD_DOCTYPES.indexOf(row.doctype) > -1 && row.name){
              if (!map[row.doctype]) map[row.doctype] = new Set();
              map[row.doctype].add(String(row.name));
            }
          });
        }
      });
      return map;
    })
    .catch(function(e){
      console.error('getChildRowsForCustomer failed', e);
      var map = {}; CHILD_DOCTYPES.forEach(function(dt){ map[dt] = new Set(); });
      return map;
    });
  }

  // 3) من أسماء ملفات مشتركة → هات الـ File docs
  function fetchFilesByNames(names){
    if (!names || !names.length) return Promise.resolve([]);
    var chunks = chunk(names, 200);
    var out=[];
    var p = Promise.resolve();
    chunks.forEach(function(list){
      p = p.then(function(){
        return frappe.call({ method:'frappe.client.get_list',
          args:{ doctype:'File',
                fields:['name','file_name','file_url','is_private','creation','owner','attached_to_doctype','attached_to_name'],
                filters:[ ['name','in', list] ],
                limit_page_length: list.length }
        }).then(function(r){ out = out.concat((r&&r.message)||[]); });
      });
    });
    return p.then(function(){ return out; });
  }

  // 4) فلترة الملفات حسب هذا العميل (Customer نفسه أو أي جدول فرعي تابع له)
  function filterFilesByCustomer(files, customer_id, childMap){
    return files.filter(function(f){
      if (f.attached_to_doctype==='Customer' && String(f.attached_to_name)===String(customer_id)) return true;
      var set = childMap[f.attached_to_doctype];
      return set ? set.has(String(f.attached_to_name)) : false;
    });
  }

  function makeAllFilesSection(){
    var sec=document.createElement('div'); sec.className='sec sec-all-files'; sec.hidden=false;
    sec.innerHTML=
      '<div class="sec-hd">'+
        '<span>كل ملفات العميل</span>'+
        '<div class="sec-actions">'+
           '<span class="count-pill">جارِ التحميل…</span>'+
           '<button class="btn-sm af-copy-links"><span class="ico">🔗</span><span>نسخ روابط المعروض</span></button>'+
           '<button class="btn-sm af-refresh"><span class="ico">⟲</span><span>تحديث</span></button>'+
        '</div>'+
      '</div>'+
      '<div class="sec-grid"></div>'+
      '<button class="more-btn" hidden>عرض الكل</button>';
    return sec;
  }

  function renderAllFilesSection(card, customer_id, opts){
    opts=opts||{};
    var existing=card.querySelector('.sec-all-files');
    if (existing && !opts.force){ existing.hidden=false; return; }
    if (existing && opts.force){ existing.remove(); }

    var sec=makeAllFilesSection();
    var before=card.querySelector('.sec-near')||card.firstChild;
    card.insertBefore(sec,before);

    var gridEl=sec.querySelector('.sec-grid');
    var moreBtn=sec.querySelector('.more-btn');
    var hintEl=sec.querySelector('.count-pill');

    sec.querySelector('.af-refresh').addEventListener('click', function(){
      _ALL_FILES_CACHE.delete('ADM_'+customer_id);
      _ALL_FILES_CACHE.delete('USR_'+customer_id);
      renderAllFilesSection(card, customer_id, {force:true});
    });
    sec.querySelector('.af-copy-links').addEventListener('click', function(){
      var links = [];
      gridEl.querySelectorAll('.chip a.btn[href]').forEach(function(a){
        var href=a.getAttribute('href'); if (href) links.push(absURL(href));
      });
      if (!links.length){ frappe.msgprint('لا يوجد روابط لنسخها.'); return; }
      copyToClipboard(links.join('\n'), 'تم نسخ '+links.length+' رابط');
    });

    var adminViewAll = isAdminForUI();
    var cacheKey = (adminViewAll? 'ADM_' : 'USR_') + customer_id;
    var cached=_ALL_FILES_CACHE.get(cacheKey);
    if (cached && (Date.now()-cached.at < ALL_FILES_TTL_MS)){ 
      build(cached.items, adminViewAll); return;
    }

    if (adminViewAll){
      // الإدمن: كل الملفات المربوطة مباشرة أو عبر الجداول الفرعية
      Promise.all([
        frappe.call({
          method:'frappe.client.get_list',
          args:{
            doctype:'File',
            fields:['name','file_name','file_url','is_private','creation','owner','attached_to_doctype','attached_to_name'],
            filters:[ ['attached_to_doctype','=','Customer'], ['attached_to_name','=', String(customer_id)] ],
            order_by:'creation desc', limit_page_length:5000
          }
        }).then(r => (r&&r.message)||[]),
        getChildRowsForCustomer(customer_id).then(function(childMap){
          var entries=[]; Object.keys(childMap).forEach(function(dt){
            var names=Array.from(childMap[dt]); if (!names.length) return;
            entries.push({dt:dt,names:names});
          });
          if (!entries.length) return [];
          var p=Promise.resolve(), out=[];
          entries.forEach(function(e){
            p=p.then(function(){
              var parts=chunk(e.names,200), chain=Promise.resolve();
              parts.forEach(function(part){
                chain=chain.then(function(){
                  return frappe.call({ method:'frappe.client.get_list',
                    args:{ doctype:'File',
                      fields:['name','file_name','file_url','is_private','creation','owner','attached_to_doctype','attached_to_name'],
                      filters:[ ['attached_to_doctype','=', e.dt], ['attached_to_name','in', part] ],
                      limit_page_length: part.length }
                  }).then(function(r){ out=out.concat((r&&r.message)||[]); });
                });
              });
              return chain;
            });
          });
          return p.then(function(){ return out; });
        })
      ]).then(function(parts){
        var items=[].concat(parts[0]||[], parts[1]||[]);
        _ALL_FILES_CACHE.set(cacheKey,{items:items, at:Date.now()});
        build(items, true);
      }).catch(function(e){
        gridEl.innerHTML='<div class="muted">تعذر تحميل ملفات العميل.</div>'; console.error(e);
      });

    }else{
      // غير الإدمن: الملفات المشتركة فقط + فلترتها على هذا العميل (Customer أو Child)
      Promise.all([
        getSharedFileNamesForCurrentUser().then(fetchFilesByNames),
        getChildRowsForCustomer(customer_id)
      ]).then(function(res){
        var sharedFiles = res[0] || [];
        var childMap    = res[1] || {};
        var items = filterFilesByCustomer(sharedFiles, customer_id, childMap);
        _ALL_FILES_CACHE.set(cacheKey,{items:items, at:Date.now()});
        build(items, false);
      }).catch(function(e){
        gridEl.innerHTML='<div class="muted">تعذر تحميل الملفات المشتركة لك.</div>'; console.error(e);
      });
    }

    function build(items, isAdmin){
      if (!items.length){
        hintEl.textContent='0 ملف';
        gridEl.innerHTML='<div class="muted">لا يوجد ملفات '+(isAdmin?'':'مُشارَكة لك ')+'على هذا العميل.</div>';
        return;
      }
      hintEl.textContent = items.length+' ملف';

      var chips = items.map(function(f){
        return makeChip(
          { name:f.name, file_name:f.file_name||f.name, file_url:f.file_url, is_private:f.is_private, owner:f.owner },
          { extraClass: (isAdmin ? '' : 'shared-direct'), note: (isAdmin ? '' : 'مُشارَك') }
        );
      });

      var expanded=false, LIMIT=60;
      function renderSet(){
        gridEl.innerHTML='';
        (expanded?chips:chips.slice(0,LIMIT)).forEach(function(ch){ gridEl.appendChild(ch); });
        if (chips.length>LIMIT){ moreBtn.hidden=false; moreBtn.textContent = expanded?'إخفاء':('عرض الكل ('+(chips.length-LIMIT)+')'); }
        else moreBtn.hidden=true;
      }
      moreBtn.onclick=function(){ expanded=!expanded; renderSet(); };
      renderSet();
    }
  }

  /* ============ Dialogs (إضافة/مشاركة/عرض المشاركات/تنظيف) ============ */

  // محاولة إدراج في أحد أسماء الـ Child Doctype بالتتابع (لو الأول فشل جرّب التاني)
  function tryInsertChild(doc, idx){
    idx = idx || 0;
    if (idx >= CHILD_DOCTYPES.length) return Promise.reject('No child doctype matched');
    var dt = CHILD_DOCTYPES[idx];
    var payload = Object.assign({}, doc, { doctype: dt });
    return frappe.call({method:'frappe.client.insert',args:{doc:payload}})
      .catch(function(e){ return tryInsertChild(doc, idx+1); });
  }

  function addAttachmentDialog(customer_id){
    var d=new frappe.ui.Dialog({
      title:'إضافة ملف', size:'small',
      fields:[
        {fieldname:'customer',label:'Customer',fieldtype:'Link',options:'Customer',default:customer_id,read_only:1,reqd:1},
        {fieldname:'doc_name',label:'إسم المستند',fieldtype:'Data',reqd:1},
        {fieldname:'doc_type',label:'نوع المستند',fieldtype:'Select',options:'\nعقد\nسجل تجاري\nبطاقة ضريبية\nسند تحصيل\nفاتورة\nأخرى',reqd:1},
        {fieldname:'start_date',label:'تاريخ بداية المستند',fieldtype:'Date'},
        {fieldname:'end_date',label:'تاريخ انتهاء المستند',fieldtype:'Date'},
        {fieldname:'file',label:'المستند المرفق',fieldtype:'Attach',reqd:1},
        {fieldname:'notes',label:'ملاحظات',fieldtype:'Small Text'}
      ],
      primary_action_label:'حفظ',
      primary_action:function(v){
        d.set_primary_action('جارِ الحفظ…', function(){});
        var baseDoc={
          customer:v.customer,
          document_name:v.doc_name,
          document_type:v.doc_type,
          document_start_date:v.start_date,
          document_end_date:v.end_date,
          attached_document:v.file,
          notes:v.notes||''
        };
        tryInsertChild(baseDoc, 0)
          .then(function(){ frappe.show_alert({message:'تمت الإضافة',indicator:'green'}); d.hide(); })
          .catch(function(e){ frappe.msgprint('تعذر حفظ المستند.'); console.error(e); });
      }
    }); d.show();
  }

  function shareFileDialog(file_name){
    var d=new frappe.ui.Dialog({
      title:'مشاركة الملف',
      fields:[
        {fieldname:'everyone',label:'إتاحة للجميع (Users)',fieldtype:'Check',default:0},
        {fieldname:'user',label:'User (اتركه فاضي لو للجميع)',fieldtype:'Link',options:'User'},
        {fieldname:'read',label:'قراءة',fieldtype:'Check',default:1},
        {fieldname:'write',label:'تعديل',fieldtype:'Check'},
        {fieldname:'share',label:'مشاركة',fieldtype:'Check'}
      ],
      primary_action_label:'مشاركة',
      primary_action:function(v){
        d.set_primary_action('…', function(){});
        frappe.call({
          method:'frappe.share.add',
          args:{ doctype:'File', name:file_name, user:v.everyone?null:v.user,
                 read:v.read?1:0, write:v.write?1:0, share:v.share?1:0, everyone:v.everyone?1:0, notify:1 }
        }).then(function(){ frappe.show_alert({message:'تمت المشاركة',indicator:'green'}); d.hide(); })
          .catch(function(e){ console.error(e); frappe.msgprint('تعذر مشاركة الملف.'); });
      }
    }); d.show();
  }

  function shareCustomerDialog(customer_id){
    var d=new frappe.ui.Dialog({
      title:'مشاركة العميل',
      fields:[
        {fieldname:'everyone',label:'إتاحة للجميع (Users)',fieldtype:'Check',default:0},
        {fieldname:'user',label:'User (اتركه فاضي لو للجميع)',fieldtype:'Link',options:'User'},
        {fieldname:'read',label:'قراءة',fieldtype:'Check',default:1},
        {fieldname:'write',label:'تعديل',fieldtype:'Check'},
        {fieldname:'share',label:'مشاركة',fieldtype:'Check'}
      ],
      primary_action_label:'مشاركة العميل',
      primary_action:function(v){
        d.set_primary_action('…', function(){});
        frappe.call({
          method:'frappe.share.add',
          args:{ doctype:'Customer', name:String(customer_id), user:v.everyone?null:v.user,
                 read:v.read?1:0, write:v.write?1:0, share:v.share?1:0, everyone:v.everyone?1:0, notify:1 }
        }).then(function(){ frappe.show_alert({message:'تمت مشاركة العميل',indicator:'green'}); d.hide(); })
          .catch(function(e){ console.error(e); frappe.msgprint('تعذر مشاركة العميل.'); });
      }
    }); d.show();
  }

  function clearCustomerSharesDialog(customer_id){
    var d=new frappe.ui.Dialog({
      title:'إلغاء كل مشاركات العميل',
      fields:[ {fieldname:'also_files',label:'إلغاء مشاركات ملفات العميل أيضًا',fieldtype:'Check',default:1} ],
      primary_action_label:'إلغاء المشاركات',
      primary_action:function(v){
        d.set_primary_action('جارِ الإلغاء…', function(){});
        frappe.call({
          method:'frappe.client.get_list',
          args:{ doctype:'DocShare', fields:['name'], filters:[ ['share_doctype','=','Customer'], ['share_name','=', String(customer_id)] ], limit_page_length:5000 }
        }).then(function(r){
          var ids=((r&&r.message)||[]).map(function(x){return x.name;});
          return deleteDocShares(ids);
        }).then(function(){
          if (!v.also_files) return;
          return frappe.call({
            method:'frappe.client.get_list',
            args:{ doctype:'File', fields:['name'], filters:[ ['attached_to_doctype','=','Customer'], ['attached_to_name','=', String(customer_id)] ], limit_page_length:5000 }
          }).then(function(fr){
            var files=((fr&&fr.message)||[]).map(function(x){return x.name;});
            if (!files.length) return;
            return frappe.call({
              method:'frappe.client.get_list',
              args:{ doctype:'DocShare', fields:['name'], filters:[ ['share_doctype','=','File'], ['share_name','in', files] ], limit_page_length:5000 }
            }).then(function(sr){
              var ids=((sr&&sr.message)||[]).map(function(x){return x.name;});
              return deleteDocShares(ids);
            });
          });
        }).then(function(){
          frappe.show_alert({message:'تم إلغاء كل المشاركات المطلوبة',indicator:'green'});
          _ALL_FILES_CACHE.delete('ADM_'+customer_id);
          _ALL_FILES_CACHE.delete('USR_'+customer_id);
          d.hide();
        }).catch(function(e){
          console.error(e);
          frappe.msgprint('تعذر إلغاء المشاركات.');
        });
      }
    });
    d.show();

    function deleteDocShares(ids){
      if (!ids || !ids.length) return Promise.resolve();
      var i=0;
      return new Promise(function(resolve){
        (function next(){
          if (i>=ids.length) return resolve();
          var id=ids[i++];
          frappe.call({ method:'frappe.client.delete', args:{ doctype:'DocShare', name:id }})
            .then(function(){ next(); })
            .catch(function(){ next(); });
        })();
      });
    }
  }

  function showSharesDialog(doctype, name){
    var d = new frappe.ui.Dialog({
      title: 'المشاركات: ' + doctype + ' / ' + name,
      size: 'large',
      fields: [{ fieldname:'html', fieldtype:'HTML' }]
    });
    d.show();
    function renderRows(rows){
      var html = ['<div style="max-height:55vh;overflow:auto">'];
      if (!rows.length) html.push('<div class="muted">لا يوجد مشاركات.</div>');
      rows.forEach(function(s){
        var who = s.everyone ? 'Everyone' : (s.user || '-');
        var rights = []; if (s.read) rights.push('قراءة'); if (s.write) rights.push('تعديل'); if (s.share) rights.push('مشاركة');
        html.push(
          '<div style="display:flex;align-items:center;gap:10px;border:1px solid #e5e7eb;border-radius:10px;padding:8px;margin:6px 0">'+
            '<div style="flex:1"><b>'+frappe.utils.escape_html(who)+'</b> <span class="badge-note">['+rights.join(', ')+']</span></div>'+
            '<button class="btn btn-xs btn-danger del" data-id="'+frappe.utils.escape_html(s.name)+'" data-user="'+frappe.utils.escape_html(s.user || '')+'" data-everyone="'+(s.everyone?1:0)+'">إلغاء</button>'+
          '</div>'
        );
      });
      html.push('</div>');
      d.fields_dict.html.$wrapper.html(html.join(''));
      d.$wrapper.find('.del').on('click', function(){
        var ds_id = this.getAttribute('data-id');
        var user  = this.getAttribute('data-user') || null;
        var everyone = parseInt(this.getAttribute('data-everyone')||'0',10) ? 1 : 0;
        frappe.confirm('متأكد من إلغاء المشاركة؟', function(){
          frappe.call({ method: 'frappe.client.delete', args: { doctype: 'DocShare', name: ds_id } })
          .then(function(){ frappe.show_alert({ message: 'تم الإلغاء', indicator: 'green' }); loadShares(); })
          .catch(function(){
            frappe.call({ method:'frappe.share.remove', args:{ doctype: doctype, name: String(name), user: user, everyone: everyone } })
              .then(function(){ frappe.show_alert({ message: 'تم الإلغاء', indicator: 'green' }); loadShares(); })
              .catch(function(e){ console.error(e); frappe.msgprint('تعذر إلغاء المشاركة.'); });
          });
        });
      });
    }
    function loadShares(){
      frappe.call({
        method: 'frappe.client.get_list',
        args: { doctype: 'DocShare', fields: ['name','user','read','write','share','everyone','modified'],
                filters: [ ['share_doctype','=', doctype], ['share_name','=', String(name)] ],
                order_by: 'modified desc', limit_page_length: 1000 }
      }).then(function(r){ renderRows((r && r.message) || []); })
        .catch(function(e){ console.error(e); d.fields_dict.html.$wrapper.html('<div class="muted">تعذر جلب المشاركات.</div>'); });
    }
    loadShares();
  }

  function copyAllLinksForCustomer(customer_id){
    frappe.call({
      method:'frappe.client.get_list',
      args:{ doctype:'File', fields:['file_url'], filters:[ ['attached_to_doctype','=','Customer'], ['attached_to_name','=', String(customer_id)] ], limit_page_length:5000 }
    }).then(function(r){
      var links=((r&&r.message)||[]).map(function(it){ return it.file_url?absURL(it.file_url):null; }).filter(Boolean);
      if (!links.length){ frappe.msgprint('لا يوجد روابط.'); return; }
      copyToClipboard(links.join('\n'), 'تم نسخ '+links.length+' رابط');
    }).catch(function(e){ console.error(e); frappe.msgprint('تعذر جلب الروابط.'); });
  }

  /* ====== No-Report Mode ====== */
  function noReportMode(){
    grid.innerHTML='';
    var wrap=document.createElement('div'); wrap.style.padding='16px';
    wrap.innerHTML='<div class="muted" style="margin-bottom:10px">لا تملك صلاحية تشغيل التقرير. نعرض لك العملاء المسموحين لك تلقائيًا.</div>';
    grid.appendChild(wrap);

    var spinner = document.createElement('div'); spinner.className='muted'; spinner.textContent='جارِ تحميل العملاء المسموحين…';
    grid.appendChild(spinner);

    getAllowedCustomersForCurrentUser()
      .then(function(ids){
        spinner.remove();
        var list = ids || [];
        if (!list.length){ var m=document.createElement('div'); m.className='muted'; m.textContent='لا يوجد عملاء متاحون لك.'; grid.appendChild(m); return; }
        list.forEach(function(cid){ renderCardForCustomer(cid, true); });
      })
      .catch(function(e){ console.error(e); spinner.textContent='تعذر تحميل العملاء.'; });
  }

  function renderCardForCustomer(customer_id, append){
    if (!append) grid.innerHTML='';
    function withName(cname){
      var card=document.createElement('div'); card.className='card';
      var head=document.createElement('div'); head.className='head'; head.innerHTML=buildHeadHTML(customer_id,cname||customer_id);
      card.appendChild(head);

      var addBtn=head.querySelector('.add-file'); if (addBtn) addBtn.addEventListener('click', function(){ addAttachmentDialog(customer_id); });
      var shareBtn=head.querySelector('.share-customer'); if (shareBtn) shareBtn.addEventListener('click', function(){ shareCustomerDialog(customer_id); });
      var viewShares=head.querySelector('.view-customer-shares'); if (viewShares) viewShares.addEventListener('click', function(){ showSharesDialog('Customer', customer_id); });
      var shareAll=head.querySelector('.share-all-files'); if (shareAll) shareAll.addEventListener('click', function(){ shareAllFilesOfCustomer(customer_id); });
      var clearShares=head.querySelector('.clear-cust-shares'); if (clearShares) clearShares.addEventListener('click', function(){ clearCustomerSharesDialog(customer_id); });
      var copyAll=head.querySelector('.copy-all-links'); if (copyAll) copyAll.addEventListener('click', function(){ copyAllLinksForCustomer(customer_id); });
      var settingsBtn=head.querySelector('.open-settings'); if (settingsBtn && hasAdminRole()){ settingsBtn.addEventListener('click', openSettingsDialog); }

      var toggle=head.querySelector('.toggle-all');
      toggle.setAttribute('data-open','1'); toggle.querySelector('.ico').textContent='📂'; toggle.querySelector('span:last-child').textContent='إخفاء كل ملفات العميل';
      toggle.addEventListener('click', function(){
        var open=toggle.getAttribute('data-open')==='1';
        var sec=card.querySelector('.sec-all-files');
        if (!open){ renderAllFilesSection(card,customer_id); expandAllSections(card); toggle.setAttribute('data-open','1'); toggle.querySelector('.ico').textContent='📂'; toggle.querySelector('span:last-child').textContent='إخفاء كل ملفات العميل'; }
        else { if (sec) sec.hidden=true; collapseAllSections(card); toggle.setAttribute('data-open','0'); toggle.querySelector('.ico').textContent='📁'; toggle.querySelector('span:last-child').textContent='عرض كل ملفات العميل'; }
      });

      renderAllFilesSection(card, customer_id, {force:true});
      grid.appendChild(card);
    }
    frappe.call({ method:'frappe.client.get', args:{ doctype:'Customer', name:String(customer_id) } })
      .then(function(r){ var name=(r&&r.message&&(r.message.customer_name||r.message.name))||customer_id; withName(name); })
      .catch(function(){ withName(customer_id); });
  }

  function shareAllFilesOfCustomer(customer_id){
    var d=new frappe.ui.Dialog({
      title:'مشاركة كل ملفات العميل',
      fields:[
        {fieldname:'everyone',label:'إتاحة للجميع (Users)',fieldtype:'Check',default:0},
        {fieldname:'user',label:'User (اتركه فاضي لو للجميع)',fieldtype:'Link',options:'User'},
        {fieldname:'read',label:'قراءة',fieldtype:'Check',default:1},
        {fieldname:'write',label:'تعديل',fieldtype:'Check'},
        {fieldname:'share',label:'مشاركة',fieldtype:'Check'}
      ],
      primary_action_label:'مشاركة الكل',
      primary_action:function(v){
        d.set_primary_action('…', function(){});
        frappe.call({
          method:'frappe.client.get_list',
          args:{ doctype:'File', fields:['name'], filters:[ ['attached_to_doctype','=','Customer'], ['attached_to_name','=', String(customer_id)] ], limit_page_length:5000 }
        }).then(function(r){
          var files=(r&&r.message)||[]; if(!files.length){ frappe.msgprint('لا يوجد ملفات لمشاركتها.'); d.hide(); return; }
          var i=0; function next(){
            if (i>=files.length){ frappe.show_alert({message:'تمت مشاركة كل الملفات',indicator:'green'}); d.hide(); return; }
            var fname=files[i++].name;
            frappe.call({ method:'frappe.share.add',
              args:{ doctype:'File', name:fname, user:v.everyone?null:v.user, read:v.read?1:0, write:v.write?1:0, share:v.share?1:0, everyone:v.everyone?1:0, notify:0 }
            }).then(next).catch(function(){ next(); });
          } next();
        }).catch(function(e){ console.error(e); frappe.msgprint('تعذر جلب ملفات العميل.'); });
      }
    }); d.show();
  }

  /* ============ Load & Render ============ */
  btn.onclick = load;
  search.oninput = debounce(render, 200);
  load();

  function load(){
    clearError();
    btn.disabled=true; btn.textContent='…';

    // ملاحظة: لو مش عايز نداء التقرير لغير الإدمن نهائيًا، فك الكومنت للسطرين الجايين:
    // if (!hasAdminRole()) { noReportMode(); btn.disabled=false; btn.textContent='تحديث'; return; }

    frappe.call({
      method:'frappe.desk.query_report.run',
      args:{ report_name:REPORT_NAME, filters:{}, ignore_prepared_report:1, user:frappe.session.user, page_length:10000 }
    }).then(function(r){
      var msg=(r&&r.message)||{};
      COLMETA=(msg.columns||[]).map(function(c,i){ return (typeof c==='string')?({label:c,fieldname:'',fieldtype:'',_idx:i}):(c._idx=i,c); });
      ROWS=msg.result||[];
      MAP={
        id   : findCol(['ID','ID العميل','العميل','customer','customer_id','name']),
        name : findCol(['اسم العميل','Customer Name','customer_name','name1']),
        near : findCol(['قرب','30','near','expiry','ستنتهي','ستنتهى','ستـ','(0–30','(0-30']),
        all  : findCol(['كل الملفات','All','سارية','بدون','active']),
        exp  : findCol(['منته','Expired','انتهى','انتهي'])
      };
      render();
      // لجلب قائمة العملاء المسموحين ثم إعادة الرسم لغير الإدمن (مع بديل من الملفات المشتركة)
      if (!isAdminForUI()){
        ALLOWED_CUSTOMERS=null; ALLOWED_CUSTOMERS_DISPLAY=null;
        getAllowedCustomersForCurrentUser()
          .then(function(ids){
            ALLOWED_CUSTOMERS = new Set((ids||[]).map(String));
            return fetchCustomerDisplayNames(ids);
          })
          .then(function(names){
            ALLOWED_CUSTOMERS_DISPLAY = new Set((names||[]).map(norm));
            render();
          })
          .catch(function(e){ console.error('فشل جلب عملاء DocShare/Files:', e); });
      }
    }).catch(function(e){
      console.error(e);
      noReportMode();
    }).then(function(){ btn.disabled=false; btn.textContent='تحديث'; });
  }

  function render(){
    try{
      var q=(search.value||'').trim().toLowerCase();
      var data=ROWS;
      // فلترة العملاء لغير الإدمن وفق DocShare
      if (!isAdminForUI()){
        if (ALLOWED_CUSTOMERS===null){ grid.innerHTML='<div class="muted">جارِ تجهيز القائمة…</div>'; return; }
        data=data.filter(function(r){
          var cid = String(getCell(r,MAP.id)||'');
          var cname = String(getCell(r,MAP.name)||'');
          var ok = false;
          if (cid && ALLOWED_CUSTOMERS.has(cid)) ok = true;
          else if (cname && ALLOWED_CUSTOMERS_DISPLAY && ALLOWED_CUSTOMERS_DISPLAY.has(norm(cname))) ok = true;
          return ok;
        });
      }
      if (q){
        data=data.filter(function(r){
          var id=String(getCell(r,MAP.id)||'').toLowerCase();
          var nm=String(getCell(r,MAP.name)||'').toLowerCase();
          return id.indexOf(q)>-1 || nm.indexOf(q)>-1;
        });
      }
      grid.innerHTML='';
      if (!data.length){ grid.innerHTML='<div class="muted">لا توجد بيانات.</div>'; return; }

      data.sort(function(a,b){
        var an=countLinks(getCell(a,MAP.near)), bn=countLinks(getCell(b,MAP.near));
        if (bn!==an) return bn-an;
        var anm=String(getCell(a,MAP.name)||''), bnm=String(getCell(b,MAP.name)||'');
        return anm.localeCompare(bnm,'ar');
      });

      data.forEach(function(r){
        var id=getCell(r,MAP.id)||'';
        var name=getCell(r,MAP.name)||id;
        var nearHTML=getCell(r,MAP.near)||'';
        var allHTML =getCell(r,MAP.all )||'';
        var expHTML =getCell(r,MAP.exp )||'';

        var nearCount=countLinks(nearHTML), allCount=countLinks(allHTML), expCount=countLinks(expHTML);

        var card=document.createElement('div'); card.className='card';
        if (nearCount>0) card.classList.add('near-first');

        var head=document.createElement('div'); head.className='head'; head.innerHTML=buildHeadHTML(id,name);
        card.appendChild(head);

        var ab=head.querySelector('.add-file'); if (ab) ab.addEventListener('click', function(){ addAttachmentDialog(id); });
        var sc=head.querySelector('.share-customer'); if (sc) sc.addEventListener('click', function(){ shareCustomerDialog(id); });
        var vs=head.querySelector('.view-customer-shares'); if (vs) vs.addEventListener('click', function(){ showSharesDialog('Customer', id); });
        var sa=head.querySelector('.share-all-files'); if (sa) sa.addEventListener('click', function(){ shareAllFilesOfCustomer(id); });
        var cc=head.querySelector('.clear-cust-shares'); if (cc) cc.addEventListener('click', function(){ clearCustomerSharesDialog(id); });
        var cp=head.querySelector('.copy-all-links'); if (cp) cp.addEventListener('click', function(){ copyAllLinksForCustomer(id); });
        var sett=head.querySelector('.open-settings'); if (sett) sett.addEventListener('click', openSettingsDialog);

        var toggleBtn=head.querySelector('.toggle-all');
        toggleBtn.addEventListener('click', function(){
          var isOpen=toggleBtn.getAttribute('data-open')==='1';
          var ico=toggleBtn.querySelector('.ico'); var txt=toggleBtn.querySelector('span:last-child');
          if (!isOpen){
            renderAllFilesSection(card,id); expandAllSections(card);
            toggleBtn.setAttribute('data-open','1'); ico.textContent='📂'; txt.textContent='إخفاء كل ملفات العميل';
          }else{
            var secAllFiles=card.querySelector('.sec-all-files'); if (secAllFiles) secAllFiles.hidden=true;
            collapseAllSections(card);
            toggleBtn.setAttribute('data-open','0'); ico.textContent='📁'; txt.textContent='عرض كل ملفات العميل';
          }
        });

        card.appendChild( renderFolderBar(card,{near:nearCount,all:allCount,exp:expCount}) );

        var secNear=makeSection('قرب الانتهاء (0–30 يوم)'); secNear.classList.add('sec-near');
        var secAll =makeSection('كل الملفات (سارية/بدون تاريخ)'); secAll.classList.add('sec-all');
        var secExp =makeSection('الملفات المنتهية'); secExp.classList.add('sec-exp');

        // === PATCHED: fillSection يعلّم الملفات المُشارَكة تلقائيًا ===
        function fillSection(sec, html){
          var gridEl=sec.querySelector('.sec-grid');
          if (!html){ gridEl.innerHTML='<div class="muted">لا يوجد</div>'; return; }

          var tmp=document.createElement('div'); tmp.innerHTML=html;
          var raws=[].slice.call(tmp.querySelectorAll('a, span, button'));

          // شرائح مبدئية + محاولات حل اسم الملف من الرابط
          var chips=[], resolvers=[];
          raws.forEach(function(x){
            var href=(x.getAttribute && x.getAttribute('href'))||'';
            var file={ name:null, file_name:(x.textContent||'').trim(), file_url:(/^javascript:/i.test(href)? null : href) };
            var ch=makeChip(file, {}); // مؤقتًا بدون تمييز
            chips.push({ chip: ch, file: file });
            if (!file.name && file.file_url){
              resolvers.push(
                resolveFileNameByUrl(file.file_url)
                  .then(function(n){ file.name=n; })
                  .catch(function(){})
              );
            }
          });

          if (!chips.length){ gridEl.innerHTML='<div class="muted">لا يوجد</div>'; return; }

          var limit=LIMITS.attach, expanded=false; var moreBtn=sec.querySelector('.more-btn');

          function renderSet(){
            gridEl.innerHTML=''; (expanded?chips:chips.slice(0,limit)).forEach(function(obj){ gridEl.appendChild(obj.chip); });
            if (chips.length>limit){ moreBtn.hidden=false; moreBtn.textContent=expanded?'إخفاء':('عرض الكل ('+(chips.length-limit)+')'); } else moreBtn.hidden=true;
          }

          // رسم مبدئي
          renderSet();
          moreBtn.onclick=function(){ expanded=!expanded; renderSet(); };

          // بعد حل الأسماء: هات DocShare وميّز الشرائح
          Promise.all(resolvers).then(function(){
            var names = chips.map(function(o){ return o.file.name; }).filter(Boolean);
            if (!names.length) return;
            return getShareInfoForFiles(names).then(function(sharesMap){
              chips.forEach(function(o){
                var n=o.file.name; if (!n) return;
                var shares = sharesMap.get(n) || [];
                if (shares.length){
                  o.chip.classList.add('shared-direct');
                  var note=o.chip.querySelector('.note');
                  if (note && note.style.display==='none'){ note.style.display=''; }
                  var badge=document.createElement('div');
                  badge.className='badge-note';
                  badge.textContent = 'مُشارَك' + (shares.length>1? (' ('+shares.length+')') : '');
                  o.chip.appendChild(badge);
                }
              });
            }).catch(function(){ /* تجاهل أخطاء التمييز */ });
          });
        }

        fillSection(secNear,nearHTML); fillSection(secAll,allHTML); fillSection(secExp,expHTML);

        card.appendChild(secNear); card.appendChild(secAll); card.appendChild(secExp);
        grid.appendChild(card);
      });
    }catch(e){ showError('حدث خطأ أثناء العرض.'); console.error(e); }
  }

})();
