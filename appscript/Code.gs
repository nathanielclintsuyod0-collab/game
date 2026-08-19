/**
 * SERAPHYX STAFF PORTAL
 * Google Apps Script + Google Sheets backend
 *
 * Setup:
 * 1. Create a Google Sheet.
 * 2. Extensions > Apps Script.
 * 3. Replace the default Code.gs with this file.
 * 4. Add Index.html from this package.
 * 5. Run setupSheets() once and authorize.
 * 6. Edit the Settings sheet and set ADMIN_EMAIL to the owner's Google account
 *    OR approve a registered account manually in the Staff sheet.
 * 7. Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone with the link
 */

const SHEETS = {
  STAFF: 'Staff',
  SCHEDULES: 'Schedules',
  ATTENDANCE: 'Attendance',
  ANNOUNCEMENTS: 'Announcements',
  SETTINGS: 'Settings'
};

const HEADERS = {
  Staff: ['Staff ID','Name','Discord Username','Discord ID','Minecraft Username','Email','Password Hash','Role','Status','Registered At','Last Login'],
  Schedules: ['Schedule ID','Staff ID','Date','Start Time','End Time','Task','Notes','Created By','Created At','Status'],
  Attendance: ['Attendance ID','Staff ID','Schedule ID','Date','Scheduled Start','Scheduled End','Clock In','Clock Out','Status','Minutes Late','Minutes Worked','Notes'],
  Announcements: ['Announcement ID','Title','Message','Author','Created At','Active'],
  Settings: ['Key','Value']
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Seraphyx Staff Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(k => {
    const name = SHEETS[k];
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]);
      sh.setFrozenRows(1);
    }
  });

  const settings = ss.getSheetByName(SHEETS.SETTINGS);
  const existing = getRows_(settings);
  const keys = existing.map(r => r[0]);
  const defaults = [
    ['PORTAL_NAME','Seraphyx Staff Portal'],
    ['ADMIN_EMAIL', Session.getActiveUser().getEmail() || ''],
    ['TIMEZONE', Session.getScriptTimeZone() || 'Asia/Manila'],
    ['AUTO_REFRESH_SECONDS','30'],
    ['DISCORD_WEBHOOK_URL','']
  ];
  const toAdd = defaults.filter(x => !keys.includes(x[0]));
  if (toAdd.length) settings.getRange(settings.getLastRow()+1,1,toAdd.length,2).setValues(toAdd);
  return {ok:true, message:'Sheets initialized.'};
}

function registerStaff(data) {
  data = data || {};
  const name = clean_(data.name);
  const discordUsername = clean_(data.discordUsername);
  const discordId = clean_(data.discordId);
  const minecraft = clean_(data.minecraft);
  const email = clean_(data.email).toLowerCase();
  const password = String(data.password || '');
  const requestedRole = clean_(data.requestedRole) || 'Helper';

  if (!name || !discordId || !minecraft || !email || password.length < 6) {
    throw new Error('Please complete all required fields. Password must be at least 6 characters.');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.');

  const sh = sheet_(SHEETS.STAFF);
  const rows = getRows_(sh);
  const emailExists = rows.some(r => String(r[5]).toLowerCase() === email);
  const discordExists = rows.some(r => String(r[3]) === discordId);
  const mcExists = rows.some(r => String(r[4]).toLowerCase() === minecraft.toLowerCase());
  if (emailExists || discordExists || mcExists) {
    throw new Error('An account with that email, Discord ID, or Minecraft username already exists.');
  }

  const id = nextId_(sh, 'SER-', 0);
  const now = new Date();
  sh.appendRow([
    id, name, discordUsername, discordId, minecraft, email,
    hash_(password), requestedRole, 'Pending', now, ''
  ]);

  return {
    ok:true,
    staffId:id,
    status:'Pending',
    message:'Registration submitted. An administrator must approve your account.'
  };
}

function login(data) {
  data = data || {};
  const identifier = clean_(data.identifier).toLowerCase();
  const password = String(data.password || '');
  if (!identifier || !password) throw new Error('Enter your Staff ID/email and password.');

  const sh = sheet_(SHEETS.STAFF);
  const rows = getRows_(sh);
  const idx = rows.findIndex(r =>
    String(r[0]).toLowerCase() === identifier ||
    String(r[5]).toLowerCase() === identifier ||
    String(r[3]).toLowerCase() === identifier
  );
  if (idx < 0) throw new Error('Account not found.');

  const r = rows[idx];
  if (String(r[6]) !== hash_(password)) throw new Error('Incorrect password.');
  if (String(r[8]).toLowerCase() !== 'active') throw new Error('Your account is not active yet.');

  const rowNumber = idx + 2;
  sh.getRange(rowNumber, 11).setValue(new Date());

  const user = userFromRow_(r);
  const token = createToken_(user.staffId);
  CacheService.getScriptCache().put('sess_' + token, user.staffId, 21600);
  return {ok:true, token, user};
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('sess_' + token);
  return {ok:true};
}

function getDashboard(token) {
  const user = requireSession_(token);
  const schedules = getSchedulesForUser_(user);
  const attendance = getAttendanceForUser_(user);
  const announcements = getAnnouncements_();
  return {
    ok:true,
    user,
    schedules,
    attendance,
    announcements,
    now: new Date().toISOString()
  };
}

function getPublicInfo() {
  return {
    name: setting_('PORTAL_NAME') || 'Seraphyx Staff Portal',
    timezone: setting_('TIMEZONE') || 'Asia/Manila',
    refreshSeconds: Number(setting_('AUTO_REFRESH_SECONDS') || 30)
  };
}

function clockIn(token, scheduleId) {
  const user = requireSession_(token);
  const sh = sheet_(SHEETS.ATTENDANCE);
  const rows = getRows_(sh);

  const active = rows.find(r =>
    String(r[1]) === user.staffId &&
    String(r[8]).toLowerCase() === 'working'
  );
  if (active) throw new Error('You are already clocked in.');

  let schedule = null;
  if (scheduleId) schedule = findSchedule_(scheduleId);
  if (!schedule) {
    schedule = findCurrentOrNextSchedule_(user.staffId);
  }

  const now = new Date();
  const attendanceId = nextId_(sh, 'ATT-', 0);
  const scheduledStart = schedule ? parseDateTime_(schedule.date, schedule.startTime) : '';
  const scheduledEnd = schedule ? parseDateTime_(schedule.date, schedule.endTime) : '';
  const late = scheduledStart ? Math.max(0, Math.floor((now - scheduledStart) / 60000)) : 0;

  sh.appendRow([
    attendanceId,
    user.staffId,
    schedule ? schedule.id : '',
    formatDate_(now),
    scheduledStart || '',
    scheduledEnd || '',
    now,
    '',
    'Working',
    late,
    '',
    ''
  ]);

  sendDiscord_(attendanceEmbed_('🟢 Staff Clocked In', user, schedule, now));
  return {ok:true, attendanceId, clockIn:now.toISOString(), lateMinutes:late};
}

function clockOut(token) {
  const user = requireSession_(token);
  const sh = sheet_(SHEETS.ATTENDANCE);
  const rows = getRows_(sh);
  let found = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1]) === user.staffId && String(rows[i][8]).toLowerCase() === 'working') {
      found = i;
      break;
    }
  }
  if (found < 0) throw new Error('No active clock-in was found.');

  const r = rows[found];
  const now = new Date();
  const clockInTime = new Date(r[6]);
  const worked = Math.max(0, Math.floor((now - clockInTime) / 60000));
  const rowNumber = found + 2;
  sh.getRange(rowNumber, 8).setValue(now);
  sh.getRange(rowNumber, 9).setValue('Completed');
  sh.getRange(rowNumber, 11).setValue(worked);

  sendDiscord_(attendanceEmbed_('🔵 Staff Clocked Out', user, null, now, worked));
  return {ok:true, clockOut:now.toISOString(), minutesWorked:worked};
}

function adminGetData(token) {
  const user = requireSession_(token);
  requireAdmin_(user);

  return {
    ok:true,
    staff: getAllStaff_(),
    schedules: getAllSchedules_(),
    attendance: getAllAttendance_(),
    announcements: getAnnouncements_()
  };
}

function approveStaff(token, staffId, approve) {
  const user = requireSession_(token);
  requireAdmin_(user);
  const sh = sheet_(SHEETS.STAFF);
  const rows = getRows_(sh);
  const idx = rows.findIndex(r => String(r[0]) === String(staffId));
  if (idx < 0) throw new Error('Staff member not found.');
  sh.getRange(idx+2, 9).setValue(approve ? 'Active' : 'Rejected');
  return {ok:true};
}

function changeStaffRole(token, staffId, role) {
  const user = requireSession_(token);
  requireAdmin_(user);
  const allowed = ['Owner','Admin','Moderator','Helper'];
  if (!allowed.includes(role)) throw new Error('Invalid role.');
  const sh = sheet_(SHEETS.STAFF);
  const rows = getRows_(sh);
  const idx = rows.findIndex(r => String(r[0]) === String(staffId));
  if (idx < 0) throw new Error('Staff member not found.');
  sh.getRange(idx+2, 8).setValue(role);
  return {ok:true};
}

function createSchedule(token, data) {
  const user = requireSession_(token);
  requireAdmin_(user);
  data = data || {};
  const staffId = clean_(data.staffId);
  const date = clean_(data.date);
  const startTime = clean_(data.startTime);
  const endTime = clean_(data.endTime);
  const task = clean_(data.task);
  const notes = clean_(data.notes);

  if (!staffId || !date || !startTime || !endTime || !task) {
    throw new Error('Staff, date, start time, end time, and task are required.');
  }
  if (!staffExists_(staffId)) throw new Error('Staff member does not exist.');

  const sh = sheet_(SHEETS.SCHEDULES);
  const id = nextId_(sh, 'SCH-', 0);
  sh.appendRow([id,staffId,date,startTime,endTime,task,notes,user.staffId,new Date(),'Scheduled']);
  return {ok:true, scheduleId:id};
}

function deleteSchedule(token, scheduleId) {
  const user = requireSession_(token);
  requireAdmin_(user);
  const sh = sheet_(SHEETS.SCHEDULES);
  const rows = getRows_(sh);
  const idx = rows.findIndex(r => String(r[0]) === String(scheduleId));
  if (idx < 0) throw new Error('Schedule not found.');
  sh.deleteRow(idx+2);
  return {ok:true};
}

function addAnnouncement(token, title, message) {
  const user = requireSession_(token);
  requireAdmin_(user);
  if (!clean_(title) || !clean_(message)) throw new Error('Title and message are required.');
  const sh = sheet_(SHEETS.ANNOUNCEMENTS);
  const id = nextId_(sh, 'ANN-', 0);
  sh.appendRow([id,clean_(title),clean_(message),user.staffId,new Date(),'Yes']);
  sendDiscord_('📢 **' + clean_(title) + '**\n' + clean_(message));
  return {ok:true};
}

/**
 * Run this from Apps Script after setup to create a time-driven reminder trigger.
 * The function checks schedules starting within the next 30 minutes and posts to
 * the configured Discord webhook. Duplicate reminders are prevented by cache.
 */
function sendUpcomingShiftReminders() {
  const webhook = setting_('DISCORD_WEBHOOK_URL');
  if (!webhook) return;
  const now = new Date();
  const horizon = new Date(now.getTime() + 30*60000);
  const schedules = getAllSchedules_();
  const staff = getAllStaff_();
  const staffMap = {};
  staff.forEach(s => staffMap[s.staffId] = s);

  schedules.forEach(s => {
    if (s.status.toLowerCase() !== 'scheduled') return;
    const start = parseDateTime_(s.date, s.startTime);
    if (!start || start < now || start > horizon) return;
    const key = 'rem_' + s.id + '_' + formatDate_(start);
    if (CacheService.getScriptCache().get(key)) return;

    const person = staffMap[s.staffId];
    if (!person) return;
    sendDiscord_(
      '⏰ **Seraphyx Staff Shift Reminder**\n' +
      '**' + person.name + '** (`' + person.staffId + '`)\n' +
      'Role: ' + person.role + '\n' +
      'Shift: ' + s.startTime + ' – ' + s.endTime + '\n' +
      'Task: ' + s.task
    );
    CacheService.getScriptCache().put(key, '1', 3600);
  });
}

// ---------- Helpers ----------

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" is missing. Run setupSheets() first.');
  return sh;
}

function getRows_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
}

function clean_(v) {
  return String(v == null ? '' : v).trim();
}

function hash_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2,'0')).join('');
}

function createToken_(staffId) {
  return Utilities.base64EncodeWebSafe(staffId + ':' + new Date().getTime() + ':' + Math.random());
}

function requireSession_(token) {
  if (!token) throw new Error('Session expired. Please log in again.');
  const staffId = CacheService.getScriptCache().get('sess_' + token);
  if (!staffId) throw new Error('Session expired. Please log in again.');
  const sh = sheet_(SHEETS.STAFF);
  const rows = getRows_(sh);
  const r = rows.find(x => String(x[0]) === String(staffId));
  if (!r || String(r[8]).toLowerCase() !== 'active') throw new Error('Account is no longer active.');
  return userFromRow_(r);
}

function requireAdmin_(user) {
  if (!['Owner','Admin'].includes(user.role)) throw new Error('Administrator permission required.');
}

function userFromRow_(r) {
  return {
    staffId:String(r[0]),
    name:String(r[1]),
    discordUsername:String(r[2]),
    discordId:String(r[3]),
    minecraft:String(r[4]),
    email:String(r[5]),
    role:String(r[7]),
    status:String(r[8]),
    registeredAt:r[9] ? new Date(r[9]).toISOString() : '',
    lastLogin:r[10] ? new Date(r[10]).toISOString() : ''
  };
}

function getAllStaff_() {
  return getRows_(sheet_(SHEETS.STAFF)).map(userFromRow_);
}

function getSchedulesForUser_(user) {
  return getAllSchedules_().filter(s => s.staffId === user.staffId);
}

function getAllSchedules_() {
  return getRows_(sheet_(SHEETS.SCHEDULES)).map(r => ({
    id:String(r[0]), staffId:String(r[1]), date:formatDateCell_(r[2]),
    startTime:formatTimeCell_(r[3]), endTime:formatTimeCell_(r[4]),
    task:String(r[5]), notes:String(r[6]), createdBy:String(r[7]),
    createdAt:r[8] ? new Date(r[8]).toISOString() : '', status:String(r[9] || 'Scheduled')
  }));
}

function getAttendanceForUser_(user) {
  return getAllAttendance_().filter(a => a.staffId === user.staffId).slice(-50).reverse();
}

function getAllAttendance_() {
  return getRows_(sheet_(SHEETS.ATTENDANCE)).map(r => ({
    id:String(r[0]), staffId:String(r[1]), scheduleId:String(r[2]),
    date:formatDateCell_(r[3]),
    scheduledStart:r[4] ? new Date(r[4]).toISOString() : '',
    scheduledEnd:r[5] ? new Date(r[5]).toISOString() : '',
    clockIn:r[6] ? new Date(r[6]).toISOString() : '',
    clockOut:r[7] ? new Date(r[7]).toISOString() : '',
    status:String(r[8]), lateMinutes:Number(r[9] || 0), minutesWorked:Number(r[10] || 0),
    notes:String(r[11] || '')
  }));
}

function getAnnouncements_() {
  return getRows_(sheet_(SHEETS.ANNOUNCEMENTS))
    .filter(r => String(r[5]).toLowerCase() === 'yes')
    .map(r => ({
      id:String(r[0]), title:String(r[1]), message:String(r[2]),
      author:String(r[3]), createdAt:r[4] ? new Date(r[4]).toISOString() : ''
    })).reverse().slice(0,20);
}

function findSchedule_(id) {
  return getAllSchedules_().find(s => s.id === String(id)) || null;
}

function findCurrentOrNextSchedule_(staffId) {
  const now = new Date();
  const arr = getAllSchedules_().filter(s => s.staffId === staffId && s.status.toLowerCase() === 'scheduled');
  let current = null, next = null;
  arr.forEach(s => {
    const start = parseDateTime_(s.date,s.startTime);
    const end = parseDateTime_(s.date,s.endTime);
    if (start && end && start <= now && now <= end) current = s;
    else if (start && start > now && (!next || start < parseDateTime_(next.date,next.startTime))) next = s;
  });
  return current || next;
}

function parseDateTime_(dateStr,timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = String(dateStr).split('-').map(Number);
  const t = String(timeStr).split(':').map(Number);
  if (d.length !== 3 || t.length < 2) return null;
  return new Date(d[0], d[1]-1, d[2], t[0], t[1], 0);
}

function formatDate_(d) {
  return Utilities.formatDate(new Date(d), setting_('TIMEZONE') || Session.getScriptTimeZone() || 'Asia/Manila', 'yyyy-MM-dd');
}

function formatDateCell_(v) {
  if (v instanceof Date && !isNaN(v)) return formatDate_(v);
  return String(v || '');
}

function formatTimeCell_(v) {
  if (v instanceof Date && !isNaN(v)) {
    return Utilities.formatDate(v, setting_('TIMEZONE') || 'Asia/Manila', 'HH:mm');
  }
  return String(v || '');
}

function setting_(key) {
  const rows = getRows_(sheet_(SHEETS.SETTINGS));
  const r = rows.find(x => String(x[0]) === key);
  return r ? String(r[1] || '') : '';
}

function staffExists_(id) {
  return getRows_(sheet_(SHEETS.STAFF)).some(r => String(r[0]) === String(id));
}

function nextId_(sh, prefix, col) {
  const rows = getRows_(sh);
  let max = 0;
  rows.forEach(r => {
    const m = String(r[col] || '').match(new RegExp('^' + prefix + '(\\d+)$'));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return prefix + String(max + 1).padStart(4,'0');
}

function sendDiscord_(content) {
  const webhook = setting_('DISCORD_WEBHOOK_URL');
  if (!webhook) return;
  try {
    UrlFetchApp.fetch(webhook, {
      method:'post',
      contentType:'application/json',
      payload:JSON.stringify({content:content}),
      muteHttpExceptions:true
    });
  } catch (e) {
    console.log('Discord webhook error: ' + e);
  }
}

function attendanceEmbed_(title, user, schedule, time, worked) {
  let text = title + '\n' +
    '**' + user.name + '** (`' + user.staffId + '`)\n' +
    'Role: ' + user.role + '\n' +
    'Time: ' + Utilities.formatDate(new Date(time), setting_('TIMEZONE') || 'Asia/Manila', 'MMM d, yyyy h:mm a');
  if (schedule) text += '\nTask: ' + schedule.task + '\nShift: ' + schedule.startTime + ' – ' + schedule.endTime;
  if (worked != null) text += '\nMinutes worked: ' + worked;
  return text;
}
