<script lang="ts">
	import { onMount } from 'svelte';
	import './admin.css';

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
		title: '',
		firstName: '',
		middleName: '',
		lastName: '',
		suffix: '',
		sex: '',
		age: '',
		employmentStatus: '',
		socialClassification: [] as string[],
		company: '',
		address: '',
		email: ''
	});
	let guestFormMessage = $state('');

	const SURVEY_CRITERIA = [
		{ key: 'rs1_obj', label: '1.A Resource Speaker 1: Achievement of session objectives' },
		{ key: 'rs1_rel', label: '1.A Resource Speaker 1: Relevance of topic covered' },
		{ key: 'rs1_mas', label: '1.A Resource Speaker 1: Mastery of the subject matter' },
		{ key: 'rs1_app', label: '1.A Resource Speaker 1: Appropriateness' },
		{ key: 'rs1_int', label: '1.A Resource Speaker 1: Opportunity for interactive participation' },
		{ key: 'rs1_pre', label: '1.A Resource Speaker 1: Presentation skills' },
		{ key: 'rs1_tim', label: '1.A Resource Speaker 1: Time management' },

		{ key: 'rs2_obj', label: '1.B Resource Speaker 2: Achievement of session objectives' },
		{ key: 'rs2_rel', label: '1.B Resource Speaker 2: Relevance of topic covered' },
		{ key: 'rs2_mas', label: '1.B Resource Speaker 2: Mastery of the subject matter' },
		{ key: 'rs2_app', label: '1.B Resource Speaker 2: Appropriateness' },
		{ key: 'rs2_int', label: '1.B Resource Speaker 2: Opportunity for interactive participation' },
		{ key: 'rs2_pre', label: '1.B Resource Speaker 2: Presentation skills' },
		{ key: 'rs2_tim', label: '1.B Resource Speaker 2: Time management' },

		{ key: 'qos_obj', label: '2. Quality of Service: Achievement of the training objectives' },
		{
			key: 'qos_use',
			label: '2. Quality of Service: Usefulness of the training to your needs/work'
		},
		{
			key: 'qos_con',
			label: '2. Quality of Service: Contribution of the training to community development'
		},
		{
			key: 'qos_cap',
			label: '2. Quality of Service: Capability of CNSC in conducting the training'
		},

		{
			key: 'tim_rel',
			label:
				'3. Timeliness of Service: Timeliness and relevance to improving current job/operations'
		},
		{
			key: 'tim_len',
			label: '3. Timeliness of Service: Length of the presentation was sufficient'
		},

		{ key: 'op_ven', label: '4. Other Particulars: Venue and related facilities' },
		{ key: 'op_equ', label: '4. Other Particulars: Tools and Equipment' },
		{ key: 'op_ref', label: '4. Other Particulars: Refreshments/food' },
		{ key: 'op_spe', label: '4. Other Particulars: Event/program speakers/facilitators' },
		{ key: 'op_act', label: '4. Other Particulars: Activities at the event' },
		{ key: 'op_obj', label: '4. Other Particulars: Achievement of the Objective/s' },
		{
			key: 'op_cap',
			label: '4. Other Particulars: Capability of CNSC to operationalize the activity'
		},
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

	let summaryData = $derived(
		SURVEY_CRITERIA.map((c) => {
			const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
			let n = 0;
			let sum = 0;

			filteredEvaluations.forEach((e) => {
				// Access ratings from JSON object if parsed, or fallback
				const v = e.ratings ? e.ratings[c.key] : null;
				const num = Number(v);
				if ([1, 2, 3, 4, 5].includes(num)) {
					counts[num] += 1;
					n += 1;
					sum += num;
				}
			});

			const wm = n ? (sum / n).toFixed(2) : '—';
			return { label: c.label, counts, wm, n };
		})
	);

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
			const [attRes, evalRes, setRes, guestRes] = await Promise.all([
				fetch('/api/attendance'),
				fetch('/api/evaluations'),
				fetch('/api/settings'),
				fetch('/api/guests')
			]);

			if (attRes.ok) attendanceData = await attRes.json();
			if (setRes.ok) settingsData = await setRes.json();
			if (guestRes.ok) guestData = await guestRes.json();
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
		return new Date(dateStr).toLocaleString();
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
				'Sex',
				'Age',
				'Employment',
				'Classifications',
				'Email'
			];
			const rows = filteredGuests.map((r) => [
				`"${r.guestId}"`,
				`"${r.firstName}"`,
				`"${r.lastName}"`,
				`"${r.company}"`,
				`"${r.sex}"`,
				`"${r.age}"`,
				`"${r.employmentStatus}"`,
				`"${Array.isArray(r.socialClassification) ? r.socialClassification.join('; ') : r.socialClassification || ''}"`,
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
			const rows = filteredAttendance.map((r) => [
				`"${r.guestId || ''}"`,
				`"${r.firstName || ''} ${r.lastName || ''}"`,
				`"${formatTime(r.timeIn || r.createdAt)}"`,
				`"${r.company || ''}"`,
				`"${r.sex || ''}"`,
				`"${r.age || ''}"`,
				`"${r.employmentStatus || ''}"`,
				`"${Array.isArray(r.socialClassification) ? r.socialClassification.join('; ') : r.socialClassification || ''}"`
			]);
			csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
			filename = `attendance-${Date.now()}.csv`;
		} else if (type === 'evaluations') {
			const headers = [
				'Guest ID',
				'Name',
				'Training',
				'Venue',
				'Date',
				'Resource Speaker 1',
				'Resource Speaker 2',
				'Q1 (Learn)',
				'Q2 (Improve)',
				'Q3 (Comments)',
				'Ratings (JSON)'
			];
			const rows = filteredEvaluations.map((r) => [
				`"${r.guestId || ''}"`,
				`"${r.participantName || ''}"`,
				`"${r.trainingTitle || ''}"`,
				`"${r.venue || ''}"`,
				`"${formatTime(r.date || r.submittedAt || r.createdAt)}"`,
				`"${r.resourceSpeaker1 || ''}"`,
				`"${r.resourceSpeaker2 || ''}"`,
				`"${(r.q1 || '').replace(/"/g, '""')}"`,
				`"${(r.q2 || '').replace(/"/g, '""')}"`,
				`"${(r.q3 || '').replace(/"/g, '""')}"`,
				`"${JSON.stringify(r.ratings || {}).replace(/"/g, '""')}"`
			]);
			csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
			filename = `evaluations-${Date.now()}.csv`;
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
			const res = await fetch('/api/guests', {
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
					title: '',
					firstName: '',
					middleName: '',
					lastName: '',
					suffix: '',
					sex: '',
					age: '',
					employmentStatus: '',
					socialClassification: [],
					company: '',
					address: '',
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
													{r.company}
													{#if r.employmentStatus}
														<br /><small class="muted">{r.employmentStatus}</small>
													{/if}
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
									<input
										type="text"
										class="search-input"
										placeholder="Search name or ID..."
										bind:value={guestFilter}
									/>
									<button
										class="btn-primary"
										onclick={() => {
											isAddingGuest = true;
											guestFormMessage = '';
										}}
									>
										Add New Guest
									</button>
									<button class="btn-secondary" onclick={() => exportCSV('guests')}>
										Export CSV
									</button>
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
									<div
										class="grid"
										style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"
									>
										<div class="field">
											<label for="reg-firstName">First Name</label>
											<input id="reg-firstName" bind:value={guestForm.firstName} required />
										</div>
										<div class="field">
											<label for="reg-lastName">Last Name</label>
											<input id="reg-lastName" bind:value={guestForm.lastName} required />
										</div>
									</div>
									<div
										class="grid"
										style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"
									>
										<div class="field">
											<label for="reg-middleName">Middle Name</label>
											<input id="reg-middleName" bind:value={guestForm.middleName} />
										</div>
										<div class="field">
											<label for="reg-suffix">Suffix</label>
											<input id="reg-suffix" bind:value={guestForm.suffix} style="width: 80px;" />
										</div>
									</div>

									<div
										class="grid"
										style="display: grid; grid-template-columns: 100px 100px 1fr; gap: 1rem;"
									>
										<div class="field">
											<label for="reg-sex">Sex</label>
											<select id="reg-sex" bind:value={guestForm.sex} required>
												<option value="">Select</option>
												<option value="M">Male</option>
												<option value="F">Female</option>
											</select>
										</div>
										<div class="field">
											<label for="reg-age">Age</label>
											<input
												id="reg-age"
												type="number"
												bind:value={guestForm.age}
												required
												style="width: 80px;"
											/>
										</div>
										<div class="field">
											<label for="reg-employment">Employment Status</label>
											<select id="reg-employment" bind:value={guestForm.employmentStatus} required>
												<option value="">Select</option>
												<option value="Private">Private</option>
												<option value="Gov't">Government</option>
												<option value="Self-Employed">Self-Employed</option>
												<option value="None">None (Student/Unemployed)</option>
											</select>
										</div>
									</div>

									<div class="field">
										<label>Social Classification (Check all that apply)</label>
										<div style="display: flex; gap: 1rem; flex-wrap: wrap;">
											{#each ['PWD', '4Ps', 'Youth', 'Senior Citizen', 'IP', 'OFW'] as sc}
												<label
													style="display: flex; align-items: center; gap: 0.5rem; font-weight: normal;"
												>
													<input
														type="checkbox"
														bind:group={guestForm.socialClassification}
														value={sc}
													/>
													{sc}
												</label>
											{/each}
										</div>
									</div>

									<div class="field">
										<label for="reg-company">Company / Organization / LGU</label>
										<input id="reg-company" bind:value={guestForm.company} required />
									</div>

									<div class="field">
										<label for="reg-address">Address / Office Address</label>
										<input id="reg-address" bind:value={guestForm.address} required />
									</div>

									<div class="field">
										<label for="reg-email">Email / Contact Number</label>
										<input id="reg-email" bind:value={guestForm.email} required />
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

									<button type="submit" class="btn-primary" style="margin-top: 1rem;"
										>Register Guest</button
									>
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
											<th>Sex/Age</th>
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
													<td>{r.sex} / {r.age}</td>
													<td>
														{r.company}
														{#if r.employmentStatus}
															<br /><small class="muted">{r.employmentStatus}</small>
														{/if}
													</td>
													<td>{r.email}</td>
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
												<td>{formatTime(r.submittedAt || r.createdAt)}</td>
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
								<h3 style="margin-bottom: 1rem;">Attendance Settings</h3>
								<div class="field">
									<label for="attOpenTime">Attendance Opening Time</label>
									<p class="form-hint">When guests can start scanning/recording attendance.</p>
									<input
										id="attOpenTime"
										type="datetime-local"
										bind:value={settingsData.attendance_open_time}
									/>
								</div>

								<div class="field">
									<label for="attCloseTime">Attendance Closing Time</label>
									<p class="form-hint">When attendance recording will close.</p>
									<input
										id="attCloseTime"
										type="datetime-local"
										bind:value={settingsData.attendance_close_time}
									/>
								</div>

								<h3 style="margin-top: 2rem; margin-bottom: 1rem;">Evaluation Settings</h3>
								<div class="field">
									<label for="evalOpenTime">Evaluation Opening Time</label>
									<p class="form-hint">When guests can start submitting evaluations.</p>
									<input
										id="evalOpenTime"
										type="datetime-local"
										bind:value={settingsData.evaluation_open_time}
									/>
								</div>

								<div class="field">
									<label for="evalCloseTime">Evaluation Closing Time</label>
									<p class="form-hint">When the evaluation form will automatically close.</p>
									<input
										id="evalCloseTime"
										type="datetime-local"
										bind:value={settingsData.evaluation_close_time}
									/>
								</div>

								<div style="margin-top: 1.5rem;">
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
