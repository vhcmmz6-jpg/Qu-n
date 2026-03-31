let db = null;
let session = null;
let tempStudentImg = ""; 
let tempGrantImg = "";
let tempBrandLogo = "";

initAppBranding(); // Hiện tên/logo ngay lập tức

try {
    if (typeof firebase !== 'undefined') {
        const firebaseConfig = {
            apiKey: "AIzaSyAcfas2KJo9n4Lpb9YVhGOpKWfYgBlSE9U",
            authDomain: "app-co-eb5d0.firebaseapp.com",
            projectId: "app-co-eb5d0",
            storageBucket: "app-co-eb5d0.firebasestorage.app",
            messagingSenderId: "160906787270",
            appId: "1:160906787270:web:638e28599f303dfddd1ac7",
            databaseURL: "https://app-co-eb5d0-default-rtdb.firebaseio.com"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        
        db.ref('config/branding').on('value', s => {
            if(s.exists()) {
                localStorage.setItem('appBranding', JSON.stringify(s.val()));
                applyBranding(s.val().name, s.val().logo);
            }
        });
    }
} catch (error) { console.log("Firebase Offline!"); }

function initAppBranding() {
    const local = JSON.parse(localStorage.getItem('appBranding') || '{"name": "KIM MIN LAI V3", "logo": ""}');
    applyBranding(local.name, local.logo);
}

function applyBranding(name, logo) {
    document.querySelectorAll('.dynamic-app-name').forEach(el => el.innerText = name || "KIM MIN LAI V3");
    document.querySelectorAll('.dynamic-logo').forEach(el => {
        if(logo) { el.src = logo; el.classList.remove('hidden'); } else el.classList.add('hidden');
    });
    if(document.getElementById('brand-name-input')) document.getElementById('brand-name-input').value = name || "";
}

function previewBrandLogo(input) {
    const reader = new FileReader();
    reader.onload = e => {
        tempBrandLogo = e.target.result;
        document.getElementById('brand-preview-logo').src = tempBrandLogo;
        document.getElementById('brand-preview-logo').classList.remove('hidden');
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
}

function saveBranding() {
    if (!db) return alert("Cần mạng để lưu Giao diện!");
    const newName = document.getElementById('brand-name-input').value.trim() || "KIM MIN LAI V3";
    let currentLogo = tempBrandLogo || JSON.parse(localStorage.getItem('appBranding') || '{}').logo || "";
    
    db.ref('config/branding').set({ name: newName, logo: currentLogo }).then(() => {
        alert("✅ Đã cập nhật Tên và Logo ứng dụng thành công!");
    });
}

// ================= ĐĂNG NHẬP CHỐNG TREO TUYỆT ĐỐI =================
function handleLogin() {
    const id = document.getElementById('username').value.trim().toLowerCase();
    const ps = document.getElementById('password').value.trim();
    const btn = document.getElementById('login-btn');

    if (!id || !ps) return alert("Điền đủ ID/Pass!");

    // 1. CỬA HẬU ADMIN - VÀO THẲNG BẰNG MỌI GIÁ KHÔNG ĐỢI MẠNG
    if (id === 'admin' && ps === '123') {
        session = { id: 'admin', role: 'admin', name: 'BOSS QUÂN' };
        startIntro(); 
        if(db) db.ref('users/admin').update({ name: 'BOSS QUÂN', role: 'admin', pass: '123' }).catch(()=>{});
        return; // Dừng luôn, không kiểm tra mạng nữa
    }

    btn.innerText = "ĐANG KẾT NỐI..."; btn.disabled = true;

    let isResolved = false;
    let localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}');

    // 2. ĐẾM NGƯỢC 3 GIÂY - NẾU MẠNG TREO THÌ VÀO OFFLINE
    setTimeout(() => {
        if(!isResolved) {
            isResolved = true;
            checkLocalLogin(id, ps, btn, localUsers);
        }
    }, 3000);

    if (!db) {
        if(!isResolved) { isResolved = true; checkLocalLogin(id, ps, btn, localUsers); }
        return;
    }

    db.ref('deleted_users/' + id).once('value').then(delSnap => {
        if(isResolved) return;
        if(delSnap.exists()) {
            isResolved = true;
            alert(`❌ TÀI KHOẢN BỊ XÓA!\nLý do: ${delSnap.val().reason}`);
            btn.innerText = "VÀO HỆ THỐNG 🚀"; btn.disabled = false; return;
        }
        db.ref('users/' + id).once('value').then(s => {
            if(isResolved) return;
            isResolved = true;
            const d = s.val();
            if (d && d.pass === ps) {
                if(d.isLocked) {
                    alert(`🔒 TÀI KHOẢN BỊ KHÓA!\nLý do: ${d.lockReason}`);
                    btn.innerText = "VÀO HỆ THỐNG 🚀"; btn.disabled = false; return;
                }
                session = { id, role: d.role, name: d.name }; 
                startIntro();
            } else {
                checkLocalLogin(id, ps, btn, localUsers);
            }
        }).catch(e => { if(!isResolved){ isResolved = true; checkLocalLogin(id, ps, btn, localUsers); }});
    }).catch(e => { if(!isResolved){ isResolved = true; checkLocalLogin(id, ps, btn, localUsers); }});
}

function checkLocalLogin(id, ps, btn, localUsers) {
    if(localUsers[id] && localUsers[id].pass === ps) {
        if(localUsers[id].isLocked) {
            alert(`🔒 TÀI KHOẢN BỊ KHÓA!\nLý do: ${localUsers[id].lockReason}`);
            btn.innerText = "VÀO HỆ THỐNG 🚀"; btn.disabled = false; return;
        }
        session = { id, role: localUsers[id].role, name: localUsers[id].name };
        startIntro();
    } else {
        alert("Sai ID hoặc Mật khẩu!");
        btn.innerText = "VÀO HỆ THỐNG 🚀"; btn.disabled = false;
    }
}

function startIntro() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('intro-overlay').classList.remove('hidden');
    
    const localAvt = localStorage.getItem('avatar_' + session.id);
    document.getElementById('intro-img').src = localAvt || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    if (db) {
        db.ref('users/' + session.id + '/avatar').once('value').then(s => {
            if(s.val()) { document.getElementById('intro-img').src = s.val(); localStorage.setItem('avatar_' + session.id, s.val()); }
        }).catch(()=>{});
    }

    setTimeout(() => {
        document.body.classList.add('shrink-anim');
        setTimeout(() => { document.getElementById('intro-overlay').classList.add('hidden'); document.body.classList.remove('shrink-anim'); enterApp(); }, 800);
    }, 1000);
}

function enterApp() {
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('display-name-real').innerText = session.name;
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.add('hidden'));
    
    if (session.role === 'admin') {
        document.getElementById('nav-manage').classList.remove('hidden');
        document.getElementById('quick-editor').classList.remove('hidden'); 
        document.getElementById('admin-photo-zone').classList.remove('hidden');
        document.getElementById('nav-rules').classList.remove('hidden');
        document.getElementById('rules-editor-zone').classList.remove('hidden');
        document.getElementById('nav-users').classList.remove('hidden'); 
        document.getElementById('nav-avatar').classList.remove('hidden'); 
        document.getElementById('nav-branding').classList.remove('hidden'); 
        document.getElementById('nav-alliance').classList.remove('hidden'); 
        document.getElementById('nav-settings').classList.remove('hidden');
        switchTab('manage'); 
    } 
    else if (session.role === 'gv') {
        document.getElementById('nav-manage').classList.remove('hidden');
        document.getElementById('quick-editor').classList.remove('hidden'); 
        document.getElementById('nav-rules').classList.remove('hidden');
        document.getElementById('rules-editor-zone').classList.remove('hidden'); 
        switchTab('manage'); 
    } 
    else {
        document.getElementById('nav-personal').classList.remove('hidden');
        document.getElementById('nav-rules').classList.remove('hidden');
        document.getElementById('rules-editor-zone').classList.add('hidden'); 
        switchTab('personal'); 
    }
    loadRealtime();
}

function onAvatarClick() { document.getElementById('user-file').click(); }
function uploadUserAvt() {
    const file = document.getElementById('user-file').files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = reader.result; document.getElementById('user-avatar').src = base64; localStorage.setItem('avatar_' + session.id, base64);
        if (db) db.ref('users/' + session.id + '/avatar').set(base64).then(() => alert("✅ Đã đổi Ảnh thành công!"));
        else alert("✅ Đã đổi Ảnh (Offline)!");
    };
    reader.readAsDataURL(file);
}

// ================= QUẢN LÝ USER =================
function createNewUser() {
    const id = document.getElementById('new-id').value.trim().toLowerCase(); const name = document.getElementById('new-name').value.trim();
    const ps = document.getElementById('new-pass').value.trim(); const r = document.getElementById('new-role').value;
    if(!id || !name || !ps) return alert("Nhập đủ ID, Tên, Pass!");
    
    const userData = { name, pass: ps, role: r, isLocked: false };
    let localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}'); localUsers[id] = userData; localStorage.setItem('localUsers', JSON.stringify(localUsers));

    if(db) db.ref('users/' + id).set(userData).then(() => { alert(`✅ TẠO THÀNH CÔNG!\nID: ${id}\nPass: ${ps}`); });
    else alert(`✅ Đã lưu Offline!\nID: ${id}\nPass: ${ps}`);
    
    document.getElementById('new-id').value=""; document.getElementById('new-name').value=""; document.getElementById('new-pass').value=""; loadUsersList();
}

function loadUsersList() {
    let localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}');
    const renderData = (data) => {
        let hsHTML = ''; let gvHTML = '';
        for(let id in data) {
            if (id === 'admin') continue; const u = data[id]; const lockChecked = u.isLocked ? "checked" : "";
            const row = `<tr><td><b>${u.name}</b><br><small style="color:var(--pink)">ID: ${id}</small></td><td>${u.pass}</td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px"><button onclick="openEditUser('${id}', '${u.name}', '${u.pass}')" class="btn-sm pink">Sửa</button><button onclick="clickDelete('${id}', '${u.name}')" class="btn-sm" style="background:#dc3545">Xóa</button><label class="switch" title="Khóa/Mở"><input type="checkbox" ${lockChecked} onchange="clickToggleLock('${id}', '${u.name}', ${u.isLocked || false}); this.checked = ${u.isLocked || false};"><span class="slider round"></span></label></div></td></tr>`;
            if (u.role === 'gv') gvHTML += row; else hsHTML += row;
        }
        document.getElementById('list-gv').innerHTML = gvHTML || "<tr><td colspan='3'>Trống</td></tr>"; document.getElementById('list-hs').innerHTML = hsHTML || "<tr><td colspan='3'>Trống</td></tr>";
    };
    renderData(localUsers);
    if(db) db.ref('users').on('value', s => { const merged = {...localUsers, ...(s.val()||{})}; localStorage.setItem('localUsers', JSON.stringify(merged)); renderData(merged); });
}

function clickToggleLock(id, name, isCurrentlyLocked) {
    if (isCurrentlyLocked) {
        if(db) db.ref('users/' + id).update({isLocked: false, lockReason: null}).then(() => alert("🔓 Đã mở khóa cho " + name));
        let localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}'); if(localUsers[id]) { localUsers[id].isLocked = false; localStorage.setItem('localUsers', JSON.stringify(localUsers)); loadUsersList(); }
    } else {
        document.getElementById('lock-u-id').value = id; document.getElementById('lock-u-name').innerText = name; document.getElementById('lock-reason').value = ""; toggleModal('lock-reason-modal', true);
    }
}
function cancelLock() { toggleModal('lock-reason-modal', false); loadUsersList(); }
function confirmLockUser() {
    const id = document.getElementById('lock-u-id').value; const reason = document.getElementById('lock-reason').value.trim() || "Vi phạm quy định";
    let localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}'); if(localUsers[id]) { localUsers[id].isLocked = true; localUsers[id].lockReason = reason; localStorage.setItem('localUsers', JSON.stringify(localUsers)); }
    if(db) db.ref('users/' + id).update({isLocked: true, lockReason: reason}).then(() => { alert("🔒 Đã khóa tài khoản!"); toggleModal('lock-reason-modal', false); });
    else { alert("🔒 Đã khóa (Offline)!"); toggleModal('lock-reason-modal', false); loadUsersList(); }
}

function clickDelete(id, name) { document.getElementById('delete-u-id').value = id; document.getElementById('delete-u-name').innerText = name; document.getElementById('delete-reason').value = ""; toggleModal('delete-reason-modal', true); }
function confirmDeleteUser() {
    const id = document.getElementById('delete-u-id').value; const reason = document.getElementById('delete-reason').value.trim() || "Bị Admin xóa";
    let localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}'); delete localUsers[id]; localStorage.setItem('localUsers', JSON.stringify(localUsers));
    if(db) {
        db.ref('deleted_users/' + id).set({ reason, time: new Date().toLocaleString() }).then(() => {
            let updates = {}; updates['users/' + id] = null; updates['grades/' + id] = null; updates['users_meta/' + id] = null;
            db.ref().update(updates).then(() => { alert("🗑️ Đã xóa sổ tài khoản!"); toggleModal('delete-reason-modal', false); });
        });
    } else { alert("🗑️ Đã xóa (Offline)!"); toggleModal('delete-reason-modal', false); loadUsersList(); }
}

function openEditUser(id, name, pass) { document.getElementById('edit-u-old-id').value = id; document.getElementById('edit-u-name').innerText = name; document.getElementById('edit-u-new-id').value = id; document.getElementById('edit-u-pass').value = pass; toggleModal('edit-user-modal', true); }
function saveUserEdit() {
    const oldId = document.getElementById('edit-u-old-id').value; const newId = document.getElementById('edit-u-new-id').value.trim().toLowerCase(); const newPass = document.getElementById('edit-u-pass').value.trim();
    if(!newId || !newPass) return alert("Không để trống!");
    let localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}');
    if(oldId === newId) {
        if(localUsers[oldId]) { localUsers[oldId].pass = newPass; localStorage.setItem('localUsers', JSON.stringify(localUsers)); }
        if(db) db.ref('users/' + oldId).update({pass: newPass}).then(() => { alert("✅ Đổi Mật khẩu thành công!"); toggleModal('edit-user-modal', false); });
        else { alert("✅ Xong (Offline)!"); toggleModal('edit-user-modal', false); loadUsersList(); }
    } else {
        if(db) {
            Promise.all([ db.ref('users/' + oldId).once('value'), db.ref('grades/' + oldId).once('value'), db.ref('users_meta/' + oldId).once('value') ]).then(snaps => {
                const uData = snaps[0].val(); const gData = snaps[1].val(); const mData = snaps[2].val();
                uData.pass = newPass; let updates = {}; updates['users/' + newId] = uData; updates['users/' + oldId] = null;
                if(gData) { updates['grades/' + newId] = gData; updates['grades/' + oldId] = null; }
                if(mData) { updates['users_meta/' + newId] = mData; updates['users_meta/' + oldId] = null; }
                db.ref().update(updates).then(() => { alert(`✅ Đã đổi ID và Pass thành công!`); toggleModal('edit-user-modal', false); });
            });
        } else alert("Cần mạng để đổi sang tên ID khác!");
    }
}

// ================= CẤP ẢNH & ĐIỂM =================
function previewGrantImg(input) { const reader = new FileReader(); reader.onload = e => { tempGrantImg = e.target.result; document.getElementById('grant-preview-img').src = tempGrantImg; document.getElementById('grant-preview-img').classList.remove('hidden'); }; if(input.files[0]) reader.readAsDataURL(input.files[0]); }
function grantAvatar() {
    const tid = document.getElementById('avatar-target-id').value.trim().toLowerCase(); if (!tid || !tempGrantImg) return alert("Nhập ID và Chọn ảnh!");
    localStorage.setItem('avatar_' + tid, tempGrantImg); 
    if(db) {
        db.ref('users/' + tid).once('value', s => {
            if(s.exists()) {
                db.ref('users/' + tid + '/avatar').set(tempGrantImg);
                db.ref('users_meta/' + tid + '/img').set(tempGrantImg).then(() => {
                    alert(`✅ ĐÃ CẤP ẢNH THÀNH CÔNG CHO ID: ${tid}`); document.getElementById('avatar-target-id').value = ''; document.getElementById('grant-preview-img').classList.add('hidden'); tempGrantImg = ''; loadUsersList();
                });
            } else alert("❌ ID không tồn tại!");
        });
    } else { alert(`✅ Đã lưu ảnh Offline cho ID: ${tid}`); document.getElementById('avatar-target-id').value = ''; document.getElementById('grant-preview-img').classList.add('hidden'); tempGrantImg = ''; }
}

function previewStudentImg(input) { const reader = new FileReader(); reader.onload = e => { tempStudentImg = e.target.result; document.getElementById('preview-img').src = tempStudentImg; document.getElementById('preview-img').classList.remove('hidden'); }; if(input.files[0]) reader.readAsDataURL(input.files[0]); }
function saveScoreData() {
    if (!db) return alert("Lỗi mạng! Cần kết nối để lưu bảng điểm.");
    const nameId = document.getElementById('s-name').value.trim().toLowerCase(); const term = document.getElementById('s-term').value; const conduct = document.getElementById('s-conduct').value;
    const m = parseFloat(document.getElementById('s-m').value) || 0; const p = parseFloat(document.getElementById('s-15p').value) || 0; const t = parseFloat(document.getElementById('s-1t').value) || 0; const thi = parseFloat(document.getElementById('s-thi').value) || 0;
    if(!nameId) return alert("Nhập ID học sinh!");
    db.ref(`grades/${nameId}/hk${term}`).set({ m, p, t, thi });
    let metaUpdate = { conduct }; if (tempStudentImg && session.role === 'admin') metaUpdate.img = tempStudentImg;
    db.ref(`users_meta/${nameId}`).update(metaUpdate).then(() => { alert("✅ LƯU ĐIỂM THÀNH CÔNG!"); document.getElementById('s-m').value=""; document.getElementById('s-15p').value=""; document.getElementById('s-1t').value=""; document.getElementById('s-thi').value=""; document.getElementById('preview-img').classList.add('hidden'); tempStudentImg = ""; });
}

// ================= NỘI QUY & HỖ TRỢ =================
function saveRules() {
    if(!db) return alert("Lỗi mạng!"); const content = document.getElementById('rules-input').value;
    db.ref('config/rules').set(content).then(() => alert("✅ Đã cập nhật Nội quy thành công!"));
}

function openSupportForm(type) { toggleModal('support-choice-modal', false); if(type === 'id') toggleModal('form-id-modal', true); else toggleModal('form-pass-modal', true); }
function submitRequest(type) {
    if (!db) return alert("Lỗi mạng! Vui lòng kiểm tra kết nối để gửi đơn.");
    let name = "", detail = "";
    if(type === 'ID') { name = document.getElementById('req-id-name').value.trim(); detail = "XIN CẤP LẠI ID"; } else { name = document.getElementById('req-pass-name').value.trim(); detail = "XIN MK MỚI: " + document.getElementById('req-pass-val').value.trim(); }
    if(!name) return alert("Nhập Tên!");
    db.ref('support_requests').push({ name, detail, type, time: new Date().toLocaleString() }).then(() => { alert("✅ ĐÃ GỬI YÊU CẦU CHO BOSS!"); toggleModal('form-id-modal', false); toggleModal('form-pass-modal', false); });
}

// ================= REALTIME DATA =================
function loadRealtime() {
    const localAvt = localStorage.getItem('avatar_' + session.id); if(localAvt) document.getElementById('user-avatar').src = localAvt;
    if (!db) return;
    db.ref('users/' + session.id + '/avatar').on('value', s => { if(s.val()) { document.getElementById('user-avatar').src = s.val(); localStorage.setItem('avatar_'+session.id, s.val(