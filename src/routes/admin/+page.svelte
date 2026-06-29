<script lang="ts">
	import { onMount } from 'svelte';
	import './admin.css';

	let eventsData: any[] = $state([]);
	let isAddingEvent = $state(false);
	let eventForm = $state({
		eventName: '',
		eventDate: '',
		venue: '',
		description: ''
	});
	let eventFormMessage = $state('');
	let editingEventId: number | null = $state(null);

	function triggerEditEvent(ev: any) {
		isAddingEvent = true;
		editingEventId = ev.id;
		eventFormMessage = '';
		// Pre-fill the form with the selected event's data
		eventForm = {
			eventName: ev.eventName || '',
			eventDate: ev.eventDate || '',
			venue: ev.venue || '',
			description: ev.description || ''
		};
	}

	import * as XLSX from 'xlsx'; // New import for Excel

	// --- Import Modal States ---
	let showImportModal = $state(false);
	let isDragging = $state(false);
	let importSourceUrl = $state('');
	let importMessage = $state('');
	let isImporting = $state(false);

	let isLoggedIn = $state(false);
	let username = $state('');
	let password = $state('');
	let loginError = $state('');

	let activeTab = $state('attendance'); // 'attendance' | 'evaluations' | 'guests' | 'documents' | 'settings'

	let attendanceData: any[] = $state([]);
	let evaluationData: any[] = $state([]);
	let guestData: any[] = $state([]);
	let settingsData: Record<string, string> = $state({});
	let stats = $state({
		attendanceCount: 0,
		evaluationCount: 0,
		pendingEvaluations: 0,
		guestCount: 0
	});

	let attendanceFilter = $state('');
	let evaluationFilter = $state('');
	let guestFilter = $state('');

	let isAddingGuest = $state(false);
	let guestForm = $state({
		firstName: '',
		lastName: '',
		company: '',
		email: ''
	});
	let guestFormMessage = $state('');

	const SPEAKER_CRITERIA = [
		{ key: 'obj', label: '1. Resource Speakers: Achievement of session objectives' },
		{ key: 'rel', label: '1. Resource Speakers: Relevance of topic covered' },
		{ key: 'mas', label: '1. Resource Speakers: Mastery of the subject matter' },
		{ key: 'app', label: '1. Resource Speakers: Appropriateness' },
		{ key: 'int', label: '1. Resource Speakers: Opportunity for interactive participation' },
		{ key: 'pre', label: '1. Resource Speakers: Presentation skills' },
		{ key: 'tim', label: '1. Resource Speakers: Time management' }
	];

	const GENERAL_CRITERIA = [
		{ key: 'qos_obj', label: '2. Quality of Service: Achievement of the training objectives' },
		{ key: 'qos_use', label: '2. Quality of Service: Usefulness of the training to your needs/work' },
		{ key: 'qos_con', label: '2. Quality of Service: Contribution of the training to community development' },
		{ key: 'qos_cap', label: '2. Quality of Service: Capability of CNSC in conducting the training' },
		{ key: 'tim_rel', label: '3. Timeliness of Service: Timeliness and relevance to improving current job/operations' },
		{ key: 'tim_len', label: '3. Timeliness of Service: Length of the presentation was sufficient' },
		{ key: 'op_ven', label: '4. Other Particulars: Venue and related facilities' },
		{ key: 'op_equ', label: '4. Other Particulars: Tools and Equipment' },
		{ key: 'op_ref', label: '4. Other Particulars: Refreshments/food' },
		{ key: 'op_spe', label: '4. Other Particulars: Event/program speakers/facilitators' },
		{ key: 'op_act', label: '4. Other Particulars: Activities at the event' },
		{ key: 'op_obj', label: '4. Other Particulars: Achievement of the Objective/s' },
		{ key: 'op_cap', label: '4. Other Particulars: Capability of CNSC to operationalize the activity' },
		{ key: 'op_ovr', label: '5. OVERALL QUALITY: Overall Quality of the Service Provided' }
	];

	const DOC_DEFAULTS = {
		f25: `CLIENT SATISFACTION SURVEY (EXTENSION)\n\nParticipant/Beneficiary\nTitle of the training:\nVenue:\nDate:\n\nRating guide:\n[5] Excellent [4] Very good [3] Good [2] Fair [1] Poor\n\nPART I. EVALUATION OF THE CONDUCT OF THE TRAINING\n- Resource Speaker 1 items\n- Resource Speaker 2 items\n- Quality of Service\n- Timeliness of Service\n\nPART II. OTHER PARTICULARS\n- Venue and related facilities\n- Tools and Equipment\n- Refreshments/food\n- Event/program speakers/facilitators\n- Activities at the event\n- Achievement of the Objective/s\n- Capability of CNSC to operationalize the activity\n- Overall Quality of the Service Provided\n\nOpen-ended questions:\n1) What was the most interesting thing you learned?\n2) What would have made the session more effective?\n3) Additional suggestions/comments/inquiries?\n\nSignature over Printed Name of Participant`,
		f26: `ATTENDANCE SHEET (EXTERNAL) – F26\n\nNotes / editable copy:\n- You can paste the official column headers here\n- Or write instructions for encoding attendance\n\nTip: Use Admin → Attendance tab to export the attendance list as CSV.`,
		f9: `NARRATIVE REPORT – F9\n\nPART 1: EXECUTIVE SUMMARY\nTitle of Extension Project:\nTitle of Extension Activity:\nDate Conducted:\nImplementing College/Delivery Unit:\nPriority Thrust implemented:\nBeneficiaries/Stakeholders/Sector:\nTotal Number of Persons Trained:\nPurpose of the conduct:\nTraining Methodology:\nEligibility (linkage/adoption/etc.):\n\nPART 2: SIGNIFICANT CONTRIBUTION\n\nPART 3: SUMMARY CLIENT SATISFACTION SURVEY\n\nPART 4: SUMMARY OF FEEDBACK\n\nPrepared by:\nCertified by:`,
		proposal: `EXTENSION PROJECT PROPOSAL – Rev. 2\n\nI. PROJECT DESCRIPTION\nProject Title:\nType of Project:\nProponent/s:\nBeneficiaries:\nLocation:\nDuration:\nBudget Requirement:\n\nII. RATIONALE\n\nIII. PROJECT ORGANIZATION/STAFFING\n\nIV. LOGICAL FRAMEWORK\n\nV. GANTT CHART\n\nVI. DETAILED BUDGET\n\nVII. MONITORING & EVALUATION\n\nVIII. OTHER INFORMATION\n\nIX. ATTACHMENTS`
	};

	let filteredAttendance = $derived(
		attendanceData.filter(
			(r) =>
				!attendanceFilter ||
				String(r.guestId || '')
					.toLowerCase()
					.includes(attendanceFilter.toLowerCase()) ||
				String(r.firstName || '')
					.toLowerCase()
					.includes(attendanceFilter.toLowerCase()) ||
				String(r.lastName || '')
					.toLowerCase()
					.includes(attendanceFilter.toLowerCase())
		)
	);

	let filteredEvaluations = $derived(
		evaluationData.filter(
			(r) =>
				!evaluationFilter ||
				String(r.guestId || '')
					.toLowerCase()
					.includes(evaluationFilter.toLowerCase()) ||
				String(r.participantName || '')
					.toLowerCase()
					.includes(evaluationFilter.toLowerCase()) ||
				String(r.trainingTitle || '')
					.toLowerCase()
					.includes(evaluationFilter.toLowerCase())
		)
	);

	let filteredGuests = $derived(
		guestData.filter(
			(r) =>
				!guestFilter ||
				String(r.guestId || '')
					.toLowerCase()
					.includes(guestFilter.toLowerCase()) ||
				String(r.firstName || '')
					.toLowerCase()
					.includes(guestFilter.toLowerCase()) ||
				String(r.lastName || '')
					.toLowerCase()
					.includes(guestFilter.toLowerCase()) ||
				String(r.company || '')
					.toLowerCase()
					.includes(guestFilter.toLowerCase())
		)
	);

	let summaryData = $derived.by(() => {
		const allCriteria = [...SPEAKER_CRITERIA, ...GENERAL_CRITERIA];

		return allCriteria.map((c) => {
			const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
			let n = 0;
			let sum = 0;

			filteredEvaluations.forEach((e) => {
				const payload = e.ratings || {};

				if (SPEAKER_CRITERIA.includes(c)) {
					// Parse dynamic speakers array
					if (Array.isArray(payload.speakers)) {
						payload.speakers.forEach((speaker: any) => {
							const v = speaker.ratings ? speaker.ratings[c.key] : null;
							const num = Number(v);
							if ([1, 2, 3, 4, 5].includes(num)) {
								counts[num] += 1;
								n += 1;
								sum += num;
							}
						});
					} 
					// Fallback for legacy data (if any old DB rows survived)
					else {
						const v1 = Number(payload[`rs1_${c.key}`]);
						const v2 = Number(payload[`rs2_${c.key}`]);
						if ([1, 2, 3, 4, 5].includes(v1)) { counts[v1]++; n++; sum += v1; }
						if ([1, 2, 3, 4, 5].includes(v2)) { counts[v2]++; n++; sum += v2; }
					}
				} else {
					// Parse general criteria
					const v = payload.general ? payload.general[c.key] : payload[c.key];
					const num = Number(v);
					if ([1, 2, 3, 4, 5].includes(num)) {
						counts[num] += 1;
						n += 1;
						sum += num;
					}
				}
			});

			const wm = n ? (sum / n).toFixed(2) : '—';
			return { label: c.label, counts, wm, n };
		});
	});

	onMount(() => {
		isLoggedIn = localStorage.getItem('adminLoggedIn') === '1';
		if (isLoggedIn) {
			loadData();
		}
	});

	async function handleLogin(e: Event) {
		e.preventDefault();
		loginError = '';

		try {
			const res = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			if (res.ok) {
				isLoggedIn = true;
				localStorage.setItem('adminLoggedIn', '1');
				loadData();
			} else {
				const data = await res.json();
				loginError = data.message || 'Invalid credentials';
			}
		} catch (e) {
			console.error(e);
			loginError = 'Login failed. Please try again.';
		}
	}

	function handleLogout() {
		isLoggedIn = false;
		localStorage.removeItem('adminLoggedIn');
		attendanceData = [];
		evaluationData = [];
		guestData = [];
	}

	async function loadData() {
		try {
			const [attRes, evalRes, setRes, guestRes, eventRes] = await Promise.all([
				fetch('/api/attendance'),
				fetch('/api/evaluations'),
				fetch('/api/settings'),
				fetch('/api/guests?all=true'),
				fetch('/api/events') // NEW API CALL
			]);

			if (attRes.ok) attendanceData = await attRes.json();
			if (setRes.ok) settingsData = await setRes.json();
			if (guestRes.ok) guestData = await guestRes.json();
			if (eventRes.ok) eventsData = await eventRes.json();
			if (evalRes.ok) {
				const raw = await evalRes.json();
				evaluationData = raw.map((r: any) => {
					// Parse detailed JSON from ratings if available (new schema)
					if (r.ratings && typeof r.ratings === 'string') {
						try {
							r.ratings = JSON.parse(r.ratings);
						} catch (e) {
							// leave as is
						}
					}
					// Legacy comment parsing just in case
					if (r.comment && r.comment.startsWith('{')) {
						try {
							const details = JSON.parse(r.comment);
							return { ...r, ...details };
						} catch (e) {}
					}
					return r;
				});
			}

			calculateStats();
		} catch (e) {
			console.error('Failed to load data', e);
		}
	}

	async function saveSettings() {
		try {
			// Save each setting individually
			for (const key of Object.keys(settingsData)) {
				await fetch('/api/settings', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ key, value: settingsData[key] })
				});
			}
			alert('Settings saved successfully!');
		} catch (e) {
			console.error(e);
			alert('Failed to save settings.');
		}
	}

	async function deleteRecord(type: 'attendance' | 'evaluations' | 'guests', id: number) {
		if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
			return;
		}

		try {
			const res = await fetch(`/api/${type}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});

			if (res.ok) {
				// Refresh data
				await loadData();
			} else {
				const err = await res.json();
				alert('Failed to delete: ' + (err.message || 'Unknown error'));
			}
		} catch (e) {
			console.error(e);
			alert('Network error while deleting.');
		}
	}

	function calculateStats() {
		stats.attendanceCount = attendanceData.length;
		stats.evaluationCount = evaluationData.length;
		stats.guestCount = guestData.length;
		stats.pendingEvaluations = Math.max(0, stats.attendanceCount - stats.evaluationCount);
	}

	function formatTime(dateStr: string) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
	}

	function downloadDoc(key: keyof typeof DOC_DEFAULTS) {
		const content = DOC_DEFAULTS[key];
		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${key}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function exportCSV(type: 'attendance' | 'evaluations' | 'summary' | 'guests') {
		let csvContent = '';
		let filename = '';

		if (type === 'guests') {
			const headers = [
				'Guest ID',
				'First Name',
				'Last Name',
				'Company',
				'Email'
			];
			const rows = filteredGuests.map((r) => [
				`"${r.guestId}"`,
				`"${r.firstName}"`,
				`"${r.lastName}"`,
				`"${r.company}"`,
				`"${r.email}"`
			]);
			csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
			filename = `guests-${Date.now()}.csv`;
		} else if (type === 'attendance') {
			const headers = [
				'Guest ID',
				'Name',
				'Time In',
				'Company/Org',
				'Sex',
				'Age',
				'Employment',
				'Classifications'
			];
			const rows = filteredAttendance.map((r) => {
				return [
					`"${r.guestId || ''}"`,
					`"${r.firstName || ''} ${r.lastName || ''}"`,
					`"${formatTime(r.timeIn || r.createdAt)}"`,
					`"${r.company || ''}"`,
					`"${r.sex || ''}"`,
					`"${r.age || ''}"`,
					`"${r.employmentStatus || ''}"`,
					`"${Array.isArray(r.socialClassification) ? r.socialClassification.join('; ') : r.socialClassification || ''}"`
				]
			});
			csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
			filename = `attendance-${Date.now()}.csv`;
		} else if (type === 'evaluations') {
			// 1. Set a maximum number of speakers to export columns for. 
			// (3 is usually safe, but you can increase it if needed)
			const maxSpeakersToExport = 3; 

			// 2. Build the flattened headers
			let headers = [
				'Guest ID',
				'Participant Name',
				'Training Title',
				'Venue',
				'Date Submitted'
			];

			// Add General Criteria headers
			GENERAL_CRITERIA.forEach(c => headers.push(`"${c.label}"`));

			// Add Speaker Criteria headers (Spk 1 Name, Spk 1 Mastery, Spk 2 Name, etc.)
			for (let i = 0; i < maxSpeakersToExport; i++) {
				headers.push(`"Speaker ${i + 1} Name"`);
				SPEAKER_CRITERIA.forEach(c => {
					// We split the label to remove the "1. Resource Speakers: " prefix to save space in Excel
					const cleanLabel = c.label.split(': ')[1] || c.label; 
					headers.push(`"Speaker ${i + 1} - ${cleanLabel}"`);
				});
			}

			headers.push('"Q1 (Learn)"', '"Q2 (Improve)"', '"Q3 (Comments)"');

			// 3. Build the flattened rows
			const rows = filteredEvaluations.map((r) => {
				const payload = r.ratings || {};
				const general = payload.general || payload; // fallback for older entries
				const speakers = Array.isArray(payload.speakers) ? payload.speakers : [];

				let rowData = [
					`"${r.guestId || ''}"`,
					`"${r.participantName || ''}"`,
					`"${r.trainingTitle || ''}"`,
					`"${r.venue || ''}"`,
					`"${formatTime(r.date || r.createdAt)}"`
				];
				console.log(r.date);
				console.log(r.createdAt);

				// Add General Scores
				GENERAL_CRITERIA.forEach(c => {
					rowData.push(`"${general[c.key] || ''}"`);
				});

				// Add Speaker Scores
				for (let i = 0; i < maxSpeakersToExport; i++) {
					const spk = speakers[i] || {};
					const spkRatings = spk.ratings || {};
					
					rowData.push(`"${spk.speakerName || ''}"`);
					SPEAKER_CRITERIA.forEach(c => {
						rowData.push(`"${spkRatings[c.key] || ''}"`);
					});
				}

				// Add text feedback
				rowData.push(
					`"${(r.q1 || '').replace(/"/g, '""')}"`,
					`"${(r.q2 || '').replace(/"/g, '""')}"`,
					`"${(r.q3 || '').replace(/"/g, '""')}"`
				);

				return rowData;
			});

			csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
			filename = `evaluations-tabulated-${Date.now()}.csv`;
		} else if (type === 'summary') {
			const headers = [
				'Criteria',
				'1 (Poor)',
				'2 (Fair)',
				'3 (Good)',
				'4 (Very Good)',
				'5 (Excellent)',
				'Weighted Mean',
				'N'
			];
			const rows = summaryData.map((r) => [
				`"${r.label}"`,
				r.counts[1],
				r.counts[2],
				r.counts[3],
				r.counts[4],
				r.counts[5],
				r.wm,
				r.n
			]);
			csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
			filename = `summary-report-${Date.now()}.csv`;
		}

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleRegisterGuest(e: Event) {
		e.preventDefault();
		guestFormMessage = 'Registering...';

		try {
			const res = await fetch('/api/guests?all=true', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(guestForm)
			});

			if (res.ok) {
				guestFormMessage = 'Guest registered successfully!';
				const newGuest = await res.json();
				// If response returns an array (from .returning()), take first item
				const added = Array.isArray(newGuest) ? newGuest[0] : newGuest;
				guestData = [added, ...guestData];
				isAddingGuest = false;
				// Reset form
				guestForm = {
					firstName: '',
					lastName: '',
					company: '',
					email: ''
				};
				calculateStats();
			} else {
				const err = await res.json();
				guestFormMessage = 'Error: ' + (err.message || 'Registration failed');
			}
		} catch (e) {
			console.error(e);
			guestFormMessage = 'Server error during registration.';
		}
	}
	// 1. Handle File Drops & Uploads
	async function handleFileUpload(file: File) {
		isImporting = true;
		importMessage = 'Reading file...';
		
		const reader = new FileReader();
		reader.onload = async (e) => {
			const data = e.target?.result;
			if (!data) return;

			// Read Excel or CSV using XLSX library
			const workbook = XLSX.read(data, { type: 'binary' });
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];
			
			// Convert sheet to 2D array
			const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
			
			await processImportedData(jsonData);
		};
		reader.readAsBinaryString(file);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			handleFileUpload(e.dataTransfer.files[0]);
		}
	}

	// 2. Handle Google Sheets Link
	async function fetchGoogleSheet() {
		if (!importSourceUrl.includes('docs.google.com/spreadsheets')) {
			importMessage = 'Please enter a valid Google Sheets URL.';
			return;
		}

		isImporting = true;
		importMessage = 'Fetching from Google Sheets...';

		try {
			// Extract the Sheet ID and construct a CSV export URL
			const sheetIdMatch = importSourceUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
			if (!sheetIdMatch) throw new Error('Invalid URL format');
			
			const sheetId = sheetIdMatch[1];
			// Warning: The Google Sheet MUST be set to "Anyone with the link can view"
			const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

			const response = await fetch(exportUrl);
			if (!response.ok) throw new Error('Could not read sheet. Ensure it is set to Public.');
			
			const csvText = await response.text();
			
			// Parse the fetched CSV text
			const workbook = XLSX.read(csvText, { type: 'string' });
			const worksheet = workbook.Sheets[workbook.SheetNames[0]];
			const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

			await processImportedData(jsonData);
		} catch (error: any) {
			importMessage = error.message;
			isImporting = false;
		}
	}
	async function processImportedData(dataRows: any[][]) {
		isImporting = true;
		importMessage = 'Validating data...';
		
		const validGuests = [];

		// Start from index 1 to skip the header row
		for (let i = 1; i < dataRows.length; i++) {
			const values = dataRows[i];
			if (!values || values.length === 0 || (!values[0] && !values[1])) continue;

			const guestData = {
				firstName: String(values[0] || '').trim(),
				lastName: String(values[1] || '').trim(),
				company: String(values[2] || '').trim(),
				email: String(values[3] || '').trim()
			};

			validGuests.push(guestData);
		}

		importMessage = `Uploading ${validGuests.length} guests...`;
		let successCount = 0;

		for (const guest of validGuests) {
			try {
				const res = await fetch('/api/guests?all=true', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(guest)
				});

				if (res.ok) {
					const added = await res.json();
					guestData = [Array.isArray(added) ? added[0] : added, ...guestData];
					successCount++;
				}
			} catch (err) {
				console.error('Failed to upload guest:', guest.firstName);
			}
		}

		calculateStats();
		importMessage = `Successfully imported ${successCount} out of ${validGuests.length} guests.`;
		isImporting = false;
		
		// Auto-close modal after 2 seconds on success
		if (successCount > 0) {
			setTimeout(() => {
				showImportModal = false;
				importMessage = '';
			}, 2500);
		}
	}
</script>

<svelte:head>
	<title>DTI Admin Dashboard</title>
</svelte:head>

<div class="admin-body">
	<header class="admin-header">
		<div class="admin-header-inner">
			<p class="dti-kicker">DTI Seminar & Workshop</p>
			<h1>Admin Dashboard</h1>
			<p class="dti-subtitle">Attendance & Evaluations</p>
		</div>
	</header>

	<main class="admin-main">
		{#if !isLoggedIn}
			<section id="adminLoginSection" class="admin-card admin-login">
				<h2>Sign in</h2>
				<form class="form" onsubmit={handleLogin}>
					<div class="field">
						<label for="adminUsername">Username</label>
						<input
							id="adminUsername"
							type="text"
							required
							placeholder="admin"
							bind:value={username}
						/>
					</div>
					<div class="field">
						<label for="adminPassword">Password</label>
						<input
							id="adminPassword"
							type="password"
							required
							placeholder="••••••••"
							bind:value={password}
						/>
					</div>
					{#if loginError}
						<p id="loginError" class="admin-error">{loginError}</p>
					{/if}
					<button type="submit" class="btn-primary">Sign in</button>
				</form>
			</section>
		{:else}
			<section id="adminPanel" class="admin-panel">
				<div class="admin-toolbar">
					<button class="btn-secondary" onclick={loadData}>Refresh</button>
					<button class="btn-ghost" onclick={handleLogout}>Sign out</button>
				</div>

				<div class="admin-stats">
					<div class="stat-card">
						<span class="stat-value">{stats.attendanceCount}</span>
						<span class="stat-label">Total Attendance</span>
					</div>
					<div class="stat-card">
						<span class="stat-value">{stats.guestCount}</span>
						<span class="stat-label">Total Guests</span>
					</div>
					<div class="stat-card">
						<span class="stat-value">{stats.evaluationCount}</span>
						<span class="stat-label">Evaluations</span>
					</div>
					<div class="stat-card">
						<span class="stat-value">{stats.pendingEvaluations}</span>
						<span class="stat-label">Pending</span>
					</div>
				</div>

				<div class="admin-tabs">
					<button
						class="admin-tab {activeTab === 'attendance' ? 'active' : ''}"
						onclick={() => (activeTab = 'attendance')}
					>
						Attendance
					</button>
					<button
						class="admin-tab {activeTab === 'guests' ? 'active' : ''}"
						onclick={() => (activeTab = 'guests')}
					>
						Guest List
					</button>
					<button
						class="admin-tab {activeTab === 'events' ? 'active' : ''}"
						onclick={() => (activeTab = 'events')}
					>
						Events
					</button>
					<button
						class="admin-tab {activeTab === 'evaluations' ? 'active' : ''}"
						onclick={() => (activeTab = 'evaluations')}
					>
						Evaluations
					</button>
					<button
						class="admin-tab {activeTab === 'settings' ? 'active' : ''}"
						onclick={() => (activeTab = 'settings')}
					>
						Settings
					</button>
				</div>

				{#if activeTab === 'attendance'}
					<section class="admin-tab-content active">
						<div class="admin-section-header">
							<h2>Attendance (QR Scans)</h2>
							<div class="admin-actions">
								<input
									type="text"
									class="search-input"
									placeholder="Search name or ID..."
									bind:value={attendanceFilter}
								/>
								<button class="btn-primary" onclick={() => exportCSV('attendance')}>
									Export CSV
								</button>
							</div>
						</div>

						<div class="table-wrapper">
							<table class="data-table">
								<thead>
									<tr>
										<th>#</th>
										<th>Guest ID</th>
										<th>Name</th>
										<th>Time In</th>
										<th>Organization/Company</th>
										<th>Action</th>
									</tr>
								</thead>
								<tbody id="attendanceList">
									{#if filteredAttendance.length === 0}
										<tr class="admin-empty"><td colspan="6">No attendance records.</td></tr>
									{:else}
										{#each filteredAttendance as r, i}
											<tr>
												<td>{i + 1}</td>
												<td><span title={r.guestId}>{r.guestId.substring(0, 8)}...</span></td>
												<td>{r.firstName} {r.lastName}</td>
												<td>{formatTime(r.timeIn || r.createdAt)}</td>
												<td>
													{r.company || 'NA'}
												</td>
												<td>
													<button
														class="btn-sm btn-danger"
														onclick={() => deleteRecord('attendance', r.id)}
														title="Delete Record">Delete</button
													>
												</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					</section>
				{/if}

				{#if activeTab === 'guests'}
					<section class="admin-tab-content active">
						<div class="admin-section-header">
							<h2>Registered Guests</h2>
							<div class="admin-actions">
								{#if !isAddingGuest}
									<div>
										<input
											type="text"
											class="search-input"
											placeholder="Search name or ID..."
											bind:value={guestFilter}
										/>
									</div>
									<div>
										<button
											class="btn-primary"
											onclick={() => {
												isAddingGuest = true;
												guestFormMessage = '';
											}}
										>
											Add New Guest
										</button>
										<button class="btn-secondary" onclick={() => { showImportModal = true; importMessage = ''; }}>
											Import Data
										</button>
										<button class="btn-secondary" onclick={() => exportCSV('guests')}>
											Export CSV
										</button>
									</div>
								{:else}
									<button
										class="btn-secondary"
										onclick={() => {
											isAddingGuest = false;
											guestFormMessage = '';
										}}
									>
										Cancel
									</button>
								{/if}
							</div>
						</div>

						{#if isAddingGuest}
							<div class="admin-card">
								<h3>Register New Guest</h3>
								<form class="form" onsubmit={handleRegisterGuest}>
									<div class="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
										<div class="field">
											<label for="reg-firstName">First Name *</label>
											<input id="reg-firstName" bind:value={guestForm.firstName} required />
										</div>
										<div class="field">
											<label for="reg-lastName">Last Name *</label>
											<input id="reg-lastName" bind:value={guestForm.lastName} required />
										</div>
									</div>

									<div class="field">
										<label for="reg-company">Company / Organization / LGU</label>
										<input id="reg-company" bind:value={guestForm.company} />
									</div>

									<div class="field">
										<label for="reg-email">Email / Contact Number</label>
										<input id="reg-email" bind:value={guestForm.email} />
									</div>

									{#if guestFormMessage}
										<p
											class="message"
											style="margin-top: 1rem;"
											class:text-danger={guestFormMessage.startsWith('Error')}
										>
											{guestFormMessage}
										</p>
									{/if}

									<button type="submit" class="btn-primary" style="margin-top: 1rem;">Register Guest</button>
								</form>
							</div>
						{:else}
							<div class="table-wrapper">
								<table class="data-table">
									<thead>
										<tr>
											<th>#</th>
											<th>Guest ID</th>
											<th>Name</th>
											<th>Company/Org</th>
											<th>Contact</th>
											<th>Action</th>
										</tr>
									</thead>
									<tbody>
										{#if filteredGuests.length === 0}
											<tr class="admin-empty"><td colspan="7">No guests found.</td></tr>
										{:else}
											{#each filteredGuests as r, i}
												<tr>
													<td>{i + 1}</td>
													<td><span title={r.guestId}>{r.guestId.substring(0, 8)}...</span></td>
													<td>{r.firstName} {r.lastName}</td>
													<td>
														{r.company || 'NA'}
													</td>
													<td>{r.email || 'NA'}</td>
													<td>
														<button
															class="btn-sm btn-danger"
															onclick={() => deleteRecord('guests', r.id)}
															title="Delete Record">Delete</button
														>
													</td>
												</tr>
											{/each}
										{/if}
									</tbody>
								</table>
							</div>
						{/if}
					</section>
				{/if}

				{#if activeTab === 'evaluations'}
					<section class="admin-tab-content active">
						<div class="admin-section-header">
							<h2>Evaluations Received</h2>
							<div class="admin-actions">
								<input
									type="text"
									class="search-input"
									placeholder="Search name or ID..."
									bind:value={evaluationFilter}
								/>
								<button class="btn-primary" onclick={() => exportCSV('evaluations')}>
									Export CSV
								</button>
							</div>
						</div>

						<div class="admin-summary">
							<div class="admin-summary-head">
								<div>
									<h3>Summary Client Satisfaction Survey</h3>
									<p class="admin-desc">
										Frequency count (1–5) and weighted mean, for the Narrative Report (F9).
									</p>
								</div>
								<button class="btn-secondary btn-sm" onclick={() => exportCSV('summary')}>
									Export Summary CSV
								</button>
							</div>
							<div class="table-wrapper">
								<table class="data-table">
									<thead>
										<tr>
											<th>Performance Criteria</th>
											<th>1</th>
											<th>2</th>
											<th>3</th>
											<th>4</th>
											<th>5</th>
											<th>Weighted Mean</th>
											<th>N</th>
										</tr>
									</thead>
									<tbody>
										{#each summaryData as r}
											<tr>
												<td>{r.label}</td>
												<td>{r.counts[1]}</td>
												<td>{r.counts[2]}</td>
												<td>{r.counts[3]}</td>
												<td>{r.counts[4]}</td>
												<td>{r.counts[5]}</td>
												<td><strong>{r.wm}</strong></td>
												<td>{r.n}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

						<div class="table-wrapper" style="margin-top: 2rem;">
							<h3>All Responses</h3>
							<table class="data-table">
								<thead>
									<tr>
										<th>#</th>
										<th>Guest ID</th>
										<th>Participant Name</th>
										<th>Training Title</th>
										<th>Date Submitted</th>
										<th>Action</th>
									</tr>
								</thead>
								<tbody>
									{#if filteredEvaluations.length === 0}
										<tr class="admin-empty"><td colspan="6">No evaluations yet.</td></tr>
									{:else}
										{#each filteredEvaluations as r, i}
											<tr>
												<td>{i + 1}</td>
												<td>
													<span title={r.guestId}>
														{r.guestId ? r.guestId.substring(0, 8) + '...' : '—'}
													</span>
												</td>
												<td>{r.participantName || '—'}</td>
												<td>{r.trainingTitle || '—'}</td>
												<td>{formatTime(r.date || r.createdAt)}</td>
												<td>
													<button
														class="btn-sm btn-danger"
														onclick={() => deleteRecord('evaluations', r.id)}
														title="Delete Record">Delete</button
													>
												</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					</section>
				{/if}

				{#if activeTab === 'events'}
					<section class="admin-tab-content active">
						<div class="admin-section-header">
							<h2>Manage Events</h2>
							<div class="admin-actions">
								{#if !isAddingEvent}
									<button class="btn-primary" onclick={() => {
										isAddingEvent = true;
										editingEventId = null;
										eventForm = { eventName: '', eventDate: '', venue: '', description: '' };
									}}>
										Add New Event
									</button>
								{:else}
									<button class="btn-secondary" onclick={() => {
										isAddingEvent = false;
										editingEventId = null;
									}}>
										Cancel
									</button>
								{/if}
							</div>
						</div>

						{#if isAddingEvent}
							<div class="admin-card">
								<h3>{editingEventId ? 'Edit Event' : 'Create New Event'}</h3>
								<form class="form" onsubmit={async (e) => {
									e.preventDefault();
									eventFormMessage = 'Saving...';
									
									const method = editingEventId ? 'PUT' : 'POST';
									const payload = editingEventId ? { ...eventForm, id: editingEventId } : eventForm;

									try {
										const res = await fetch('/api/events', {
											method,
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify(payload)
										});
										
										if (res.ok) {
											await loadData(); // Refresh the list
											isAddingEvent = false;
											editingEventId = null;
											eventForm = { eventName: '', eventDate: '', venue: '', description: '' };
										} else {
											const err = await res.json();
											eventFormMessage = err.message || 'Failed to save event.';
										}
									} catch (err) {
										eventFormMessage = 'Network error.';
									}
								}}>
									<div class="field">
										<label>Event Name *</label>
										<input bind:value={eventForm.eventName} required />
									</div>
									
									<div class="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
										<div class="field">
											<label>Event Date & Time</label>
											<div class="datetime-wrapper">
												<input 
													type="datetime-local" 
													class="clickable-datetime" 
													bind:value={eventForm.eventDate} 
													required 
												/>
											</div>
										</div>
										<div class="field">
											<label>Venue</label>
											<input bind:value={eventForm.venue} />
										</div>
									</div>

									<div class="field">
										<label>Description</label>
										<textarea bind:value={eventForm.description} rows="3"></textarea>
									</div>

									{#if eventFormMessage}
										<p class="message text-danger">{eventFormMessage}</p>
									{/if}

									<button type="submit" class="btn-primary" style="margin-top: 1rem;">
										{editingEventId ? 'Update Event' : 'Save Event'}
									</button>
								</form>
							</div>
						{:else}
							<div class="table-wrapper">
								<table class="data-table">
									<thead>
										<tr>
											<th>#</th>
											<th>Event Name</th>
											<th>Date</th>
											<th>Venue</th>
											<th>Action</th>
										</tr>
									</thead>
									<tbody>
										{#if eventsData.length === 0}
											<tr class="admin-empty"><td colspan="5">No events found.</td></tr>
										{:else}
											{#each eventsData as ev, i}
												<tr>
													<td>{i + 1}</td>
													<td><strong>{ev.eventName}</strong></td>
													<td>{ev.eventDate ? new Date(ev.eventDate).toLocaleString() : 'TBA'}</td>
													<td>{ev.venue || 'TBA'}</td>
													<td>
														<div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
															<button
																class="btn-sm btn-secondary"
																onclick={() => triggerEditEvent(ev)}
																title="Edit Event">Edit
															</button>
															<button
																class="btn-sm btn-danger"
																onclick={() => deleteRecord('events', ev.id)}
																title="Delete Event">Delete
															</button>
														</div>
													</td>
												</tr>
											{/each}
										{/if}
									</tbody>
								</table>
							</div>
						{/if}
					</section>
				{/if}

				{#if activeTab === 'settings'}
					<section class="admin-tab-content active">
						<div class="admin-section-header">
							<h2>System Settings</h2>
							<p class="admin-desc">Manage system configuration and evaluation period.</p>
						</div>

						<div class="admin-card">
							<form
								class="form"
								onsubmit={(e) => {
									e.preventDefault();
									saveSettings();
								}}
							>
								<div class="settings-group">
									<div class="group-header">
										<h3>Attendance Period</h3>
										<p class="form-hint">Define when guests can scan in and record attendance.</p>
									</div>
									
									<div class="datetime-grid">
										<div class="field">
											<label for="attOpenTime">Opening Time</label>
											<div class="datetime-wrapper">
												<input
													id="attOpenTime"
													type="datetime-local"
													class="clickable-datetime"
													bind:value={settingsData.attendance_open_time}
												/>
											</div>
										</div>

										<div class="field">
											<label for="attCloseTime">Closing Time</label>
											<div class="datetime-wrapper">
												<input
													id="attCloseTime"
													type="datetime-local"
													class="clickable-datetime"
													bind:value={settingsData.attendance_close_time}
												/>
											</div>
										</div>
									</div>
								</div>

								<div class="settings-group" style="margin-top: 2.5rem;">
									<div class="group-header">
										<h3>Evaluation Period</h3>
										<p class="form-hint">Define when the evaluation forms become accessible to guests.</p>
									</div>

									<div class="datetime-grid">
										<div class="field">
											<label for="evalOpenTime">Opening Time</label>
											<div class="datetime-wrapper">
												<input
													id="evalOpenTime"
													type="datetime-local"
													class="clickable-datetime"
													bind:value={settingsData.evaluation_open_time}
												/>
											</div>
										</div>

										<div class="field">
											<label for="evalCloseTime">Closing Time</label>
											<div class="datetime-wrapper">
												<input
													id="evalCloseTime"
													type="datetime-local"
													class="clickable-datetime"
													bind:value={settingsData.evaluation_close_time}
												/>
											</div>
										</div>
									</div>
								</div>

								<div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-subtle);">
									<button type="submit" class="btn-primary">Save Settings</button>
								</div>
							</form>
						</div>
					</section>
				{/if}
			</section>
		{/if}
	</main>
</div>
{#if showImportModal}
	<div class="modal-overlay active">
		<div class="modal-dialog" style="max-width: 500px; text-align: left;">
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
				<h3 style="margin: 0; color: var(--accent-color);">Import Guest List</h3>
				<button class="btn-ghost" style="padding: 4px 8px;" onclick={() => showImportModal = false}>✕</button>
			</div>

			<div class="field">
				<label>Upload File (Excel or CSV)</label>
				<div 
					class="drag-zone {isDragging ? 'dragging' : ''}"
					ondragover={(e) => { e.preventDefault(); isDragging = true; }}
					ondragleave={() => isDragging = false}
					ondrop={onDrop}
					onclick={() => document.getElementById('hiddenFileInput')?.click()}
					role="button"
					tabindex="0"
				>
					<input 
						type="file" 
						id="hiddenFileInput" 
						accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
						style="display: none;" 
						onchange={(e) => {
							const file = (e.target as HTMLInputElement).files?.[0];
							if (file) handleFileUpload(file);
						}}
					/>
					<div style="font-size: 32px; margin-bottom: 8px; color: var(--text-muted);">📄</div>
					<strong>Click to browse</strong> or drag and drop a file here
					<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Supports .xlsx, .xls, .csv</div>
				</div>
			</div>

			<div style="text-align: center; margin: 16px 0; color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
				— OR —
			</div>

			<div class="field">
				<label for="sheetUrl">Import via Google Sheets</label>
				<p style="font-size: 11px; color: var(--accent-color); margin-bottom: 8px; font-style: italic;">
					* Ensure the sheet's access is set to "Anyone with the link can view".
				</p>
				<div style="display: flex; gap: 8px;">
					<input 
						id="sheetUrl" 
						type="url" 
						placeholder="https://docs.google.com/spreadsheets/d/..." 
						bind:value={importSourceUrl} 
						disabled={isImporting}
					/>
					<button class="btn-secondary" onclick={fetchGoogleSheet} disabled={isImporting || !importSourceUrl}>
						Fetch
					</button>
				</div>
			</div>

			{#if importMessage}
				<div class="message" style="margin-top: 16px; background: rgba(255, 214, 0, 0.1); border-left: 4px solid var(--accent-color); color: var(--text-main);">
					{importMessage}
				</div>
			{/if}
		</div>
	</div>
{/if}
