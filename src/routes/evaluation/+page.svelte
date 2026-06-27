<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let guestId = $state.raw('');
	let formMessage = $state.raw('');
	let closedMessage = $state.raw('');
	let isSubmitting = $state.raw(false);

	// View state: 'loading' | 'evaluation' | 'success' | 'already-submitted' | 'evaluation-closed'
	let currentView = $state.raw('loading');

	// Evaluation Form Data
	let participantName = $state.raw('');
	let trainingTitle = $state.raw(
		'Empowering Collaboration, Active Participation, and Professional Engagement Through Digital Tools'
	);
	let venue = $state.raw('CCMS Lab 2, CNSC, Daet Camarines Norte');
	let date = $state.raw(new Date().toISOString().split('T')[0]);
	let resourceSpeaker1 = $state.raw('');
	let resourceSpeaker2 = $state.raw('');
	let ratings: Record<string, string> = $state({});
	let q1 = $state.raw('');
	let q2 = $state.raw('');
	let q3 = $state.raw('');

	// Matrix definition
	const speaker1Items = [
		{
			key: 'rs1_obj',
			label: 'Achievement of session objectives',
			sub: 'Pagtatamo ng layunin ng sesyon'
		},
		{
			key: 'rs1_rel',
			label: 'Relevance of topic covered',
			sub: 'Kaugnayan ng pagsasanay sa paksa'
		},
		{ key: 'rs1_mas', label: 'Mastery of the subject matter', sub: 'Kasanayan sa paksa o aralin' },
		{ key: 'rs1_app', label: 'Appropriateness', sub: 'Kaangkupan ng nilalaman' },
		{
			key: 'rs1_int',
			label: 'Opportunity for interactive participation',
			sub: 'Pagkakataon para sa interaktibong partisipasyon'
		},
		{ key: 'rs1_pre', label: 'Presentation skills', sub: 'Kasanayan sa paglalahad' },
		{ key: 'rs1_tim', label: 'Time management', sub: 'Pamamahala sa oras' }
	];

	const speaker2Items = [
		{
			key: 'rs2_obj',
			label: 'Achievement of session objectives',
			sub: 'Pagtatamo ng layunin ng sesyon'
		},
		{
			key: 'rs2_rel',
			label: 'Relevance of topic covered',
			sub: 'Kaugnayan ng pagsasanay sa paksa'
		},
		{ key: 'rs2_mas', label: 'Mastery of the subject matter', sub: 'Kasanayan sa paksa o aralin' },
		{ key: 'rs2_app', label: 'Appropriateness', sub: 'Kaangkupan ng nilalaman' },
		{
			key: 'rs2_int',
			label: 'Opportunity for interactive participation',
			sub: 'Pagkakataon para sa interaktibong partisipasyon'
		},
		{ key: 'rs2_pre', label: 'Presentation skills', sub: 'Kasanayan sa paglalahad' },
		{ key: 'rs2_tim', label: 'Time management', sub: 'Pamamahala sa oras' }
	];

	const serviceItems = [
		{
			key: 'qos_obj',
			label: 'Achievement of the training objectives',
			sub: 'Pagkamit ng mga layunin ng pagsasanay'
		},
		{
			key: 'qos_use',
			label: 'Usefulness of the training to your needs/work',
			sub: 'Kapakinabangan ng pagsasanay batay sa iyong pangangailangan/trabaho'
		},
		{
			key: 'qos_con',
			label: 'Contribution of the training to community development',
			sub: 'Ambag ng pagsasanay sa kaunlaran ng komunidad'
		},
		{
			key: 'qos_cap',
			label: 'Capability of CNSC in conducting the training',
			sub: 'Kakayahan ng CNSC sa pagsasagawa ng pagsasanay'
		},
		{
			key: 'tim_rel',
			label: 'Timeliness and relevance to improving current job/operations',
			sub: 'Napapanahon at may kaugnayan sa pagpapabuti ng iyong kasalukuyang trabaho/operasyon'
		},
		{
			key: 'tim_len',
			label: 'Length of the presentation was sufficient for covering the topic',
			sub: 'May sapat na haba ang presentasyon para talakayin ang buong paksa'
		}
	];

	const itemsPart2 = [
		{
			key: 'op_ven',
			label: 'Venue and related facilities',
			sub: 'Lugar at mga kaugnay na pasilidad'
		},
		{ key: 'op_equ', label: 'Tools and Equipment', sub: 'Mga kasangkapan at kagamitan' },
		{ key: 'op_ref', label: 'Refreshments/food', sub: 'Pagkain at meryenda' },
		{
			key: 'op_spe',
			label: 'Event/program speakers/facilitators',
			sub: 'Mga tagapagsalita/tagapagpadaloy ng programa'
		},
		{ key: 'op_act', label: 'Activities at the event', sub: 'Mga aktibidad sa programa' },
		{ key: 'op_obj', label: 'Achievement of the Objective/s', sub: 'Pagkamit ng layunin' },
		{
			key: 'op_cap',
			label: 'Capability of CNSC to operationalize the activity',
			sub: 'Kakayahan ng CNSC na maisakatuparan ang aktibidad'
		},
		{
			key: 'op_ovr',
			label: 'Overall Quality of the Service Provided',
			sub: 'Kabuuang kalidad ng serbisyong ibinigay'
		}
	];

	// Calculate progress dynamically based on how many tabs the user has added
	let answeredCount = $derived(
		Object.keys(ratings).length + 
		tabs.reduce((sum, tab) => sum + Object.keys(tab.ratings).length, 0)
	);

	// Calculate total items required: Part 2 items + (number of tabs * speaker items)
	let totalItems = $derived(
		itemsPart2.length + serviceItems.length + (tabs.length * speakerItems.length)
	);

	let progressPct = $derived(totalItems ? Math.round((answeredCount / totalItems) * 100) : 0);

	let currentGuestName = $state.raw('Guest');

	onMount(async () => {
		const storedId = localStorage.getItem('dti_session_guest_id');
		if (!storedId) {
			goto('/attendance');
			return;
		}

		guestId = storedId;

		try {
			// Fetch guest details
			const guestsRes = await fetch('/api/guests');
			if (guestsRes.ok) {
				const guests = await guestsRes.json();
				const s = guests.find((g: any) => g.guestId === guestId);
				if (s) {
					currentGuestName = `${s.firstName} ${s.lastName}`;
					participantName = `${s.firstName} ${s.lastName}`;
				}
			}

			// Check evaluation status
			const res = await fetch(`/api/evaluations/check?guestId=${guestId}`);
			if (res.ok) {
				const data = await res.json();
				if (data.submitted) {
					currentView = 'already-submitted';
					return;
				}
				if (data.isOpen === false) {
					currentView = 'evaluation-closed';
					closedMessage = data.message || 'Evaluation is currently closed.';
					return;
				}
				currentView = 'evaluation';
			} else {
				// Invalid session
				localStorage.removeItem('dti_session_guest_id');
				goto('/attendance');
			}
		} catch (e) {
			console.error(e);
			goto('/attendance');
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		formMessage = '';
		isSubmitting = true;

		if (!participantName || !trainingTitle || !venue || !date) {
			formMessage = 'Please complete all required fields.';
			isSubmitting = false;
			return;
		}

		// Make sure every tab has a speaker assigned
		const unassignedTab = tabs.find(t => !t.speakerId);
		if (unassignedTab) {
			formMessage = 'Please assign a speaker to every open tab, or close unused tabs.';
			isSubmitting = false;
			return;
		}

		if (answeredCount < totalItems) {
			formMessage = 'Please answer all rating items (1–5).';
			isSubmitting = false;
			return;
		}

		try {
			// 1. Extract and format the dynamic speaker tabs
			const speakerEvaluations = tabs.map(tab => {
				const speakerDetails = availableSpeakers.find(s => s.id === tab.speakerId);
				return {
					speakerId: tab.speakerId,
					speakerName: speakerDetails ? speakerDetails.name : 'Unknown',
					ratings: tab.ratings
				};
			});

			// 2. Build the payload. 
			// 'ratings' here automatically contains both serviceItems and itemsPart2!
			const data = {
				guestId,
				participantName,
				trainingTitle,
				venue,
				date,
				speakerEvaluations, // Sends the extracted tabs
				generalRatings: ratings, // Sends Part 2 AND Service ratings
				q1,
				q2,
				q3,
				submittedAt: new Date().toISOString()
			};

			const res = await fetch('/api/evaluations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (res.ok) {
				formMessage = 'Thank you! Your evaluation has been submitted.';
				currentView = 'success';
				localStorage.removeItem('dti_session_guest_id');
			} else {
				const errorData = await res.json();
				formMessage = errorData.error || 'Failed to submit evaluation. Please try again.';
			}
		} catch (e) {
			formMessage = 'An error occurred. Please try again later.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleSignout() {
		localStorage.removeItem('dti_session_guest_id');
		localStorage.removeItem('dti_locked_guest_id');
		goto('/attendance');
	}

	// Expanded mock database with image URLs
	const availableSpeakers = [
		{ id: 's1', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=s1' },
		{ id: 's2', name: 'Jane Smith', imageUrl: 'https://i.pravatar.cc/150?u=s2' },
		{ id: 's3', name: 'Dr. Alan Turing', imageUrl: 'https://i.pravatar.cc/150?u=s3' }
	];

	type SpeakerTab = {
		id: string;
		speakerId: string; // Changed to track by ID instead of just name
		ratings: Record<string, string>;
	};

	let tabs = $state<SpeakerTab[]>([
		{ id: crypto.randomUUID(), speakerId: '', ratings: {} }
	]);
	
	let activeTabId = $state(tabs[0].id);
	let activeTab = $derived(tabs.find(t => t.id === activeTabId));

	// Helper to get the full speaker object for the active tab
	let activeSpeakerDetails = $derived(
		availableSpeakers.find(s => s.id === activeTab?.speakerId)
	);

	// The criteria matrix with Tagalog sub-labels included
	const speakerItems = [
		{
			key: 'obj',
			label: 'Achievement of session objectives',
			sub: 'Pagtatamo ng layunin ng sesyon' 
		},
		{
			key: 'rel',
			label: 'Relevance of topic covered',
			sub: 'Kaugnayan ng pagsasanay sa paksa' 
		},
		{ 
            key: 'mas', 
            label: 'Mastery of the subject matter', 
            sub: 'Kasanayan sa paksa o aralin' 
        },
		{ 
            key: 'app', 
            label: 'Appropriateness', 
            sub: 'Kaangkupan ng nilalaman' 
        },
		{
			key: 'int',
			label: 'Opportunity for interactive participation',
			sub: 'Pagkakataon para sa interaktibong partisipasyon' 
		},
		{ 
            key: 'pre', 
            label: 'Presentation skills', 
            sub: 'Kasanayan sa paglalahad' 
        },
		{ 
            key: 'tim', 
            label: 'Time management', 
            sub: 'Pamamahala sa oras' 
        }
	];

	function addSpeakerTab() {
		const newId = crypto.randomUUID();
		tabs.push({ id: newId, speakerId: '', ratings: {} });
		activeTabId = newId;
	}

	function removeTab(idToRemove: string) {
		tabs = tabs.filter(t => t.id !== idToRemove);
		if (activeTabId === idToRemove && tabs.length > 0) {
			activeTabId = tabs[0].id;
		}
	}

	function isTabComplete(tab: SpeakerTab) {
		if (!tab.speakerId) return false;
		return Object.keys(tab.ratings).length === speakerItems.length;
	}
</script>

<svelte:head>
	<title>DTI Evaluation</title>
</svelte:head>

<header class="dti-header">
	<div class="dti-title">
		<p class="dti-kicker">Seminar & Workshop</p>
		<h1>Empowering Collaboration, Active Participation, and Professional Engagement Through Digital Tools</h1>
		<p class="dti-subtitle">DTI Seminar &amp; Workshop &mdash; Evaluation</p>
	</div>
</header>

<main class="card">
	{#if currentView === 'loading'}
		<p>Loading...</p>
	{:else if currentView === 'evaluation-closed'}
		<h2 id="modeTitle">Evaluation Closed</h2>
		<p class="subtitle" style="text-align: center;">
			{closedMessage}
		</p>
		<button class="btn-secondary" onclick={handleSignout}>Back to Attendance</button>
	{:else if currentView === 'evaluation'}
		<h2 id="modeTitle">Seminar Evaluation</h2>

		<p class="subtitle">
			Evaluating as: <strong>{currentGuestName}</strong> <br />
			<small class="muted">ID: {guestId}</small>
		</p>

		<div class="progress-card" aria-live="polite">
			<div class="progress-top">
				<div>
					<div class="progress-title">Progress</div>
					<div class="progress-sub" id="progressText">
						{answeredCount} / {totalItems} rating items answered
					</div>
				</div>
				<div class="progress-badge" id="progressBadge">{progressPct}%</div>
			</div>
			<div class="progress-bar" aria-hidden="true">
				<div class="progress-fill" id="progressFill" style="width: {progressPct}%"></div>
			</div>
			<div class="progress-hint">
				Tip: You can answer one section at a time (Speaker 1, Speaker 2, Service, Other
				Particulars).
			</div>
		</div>

		<form class="form" onsubmit={handleSubmit}>
			<section class="form-section">
				<h3>Participant / Beneficiary</h3>
				<div class="field">
					<label for="participantName">Full Name</label>
					<input
						id="participantName"
						bind:value={participantName}
						type="text"
						required
						autocomplete="name"
						readonly
					/>
				</div>
				<div class="field">
					<label for="trainingTitle">Title of the training</label>
					<input id="trainingTitle" bind:value={trainingTitle} type="text" required readonly />
				</div>
				<div class="field">
					<label for="venue">Venue</label>
					<input id="venue" bind:value={venue} type="text" required readonly />
				</div>
				<div class="field">
					<label for="date">Date</label>
					<input id="date" bind:value={date} type="date" required readonly />
				</div>
				<p class="note">
					Rating guide: <strong>5</strong> Excellent, <strong>4</strong> Very good,
					<strong>3</strong>
					Good,
					<strong>2</strong> Fair, <strong>1</strong> Poor.
				</p>
			</section>

			<section class="form-section">
				<div class="evaluation-container">
				<!-- STICKY TAB BAR -->
				<div class="tabs-header">
					{#each tabs as tab, index}
						{@const tabSpeaker = availableSpeakers.find(s => s.id === tab.speakerId)}
						<button 
							class="tab {activeTabId === tab.id ? 'active' : ''}"
							onclick={(e) => { e.preventDefault(); activeTabId = tab.id; }}
						>
							<span class="status-dot {isTabComplete(tab) ? 'complete' : 'incomplete'}"></span>
							
							{#if tabSpeaker}
								<img src={tabSpeaker.imageUrl} alt={tabSpeaker.name} class="tab-mini-avatar" />
							{/if}

							{tabSpeaker ? tabSpeaker.name : `Speaker ${index + 1}`}
							
							{#if tabs.length > 1}
								<button class="close-btn" onclick={(e) => { e.stopPropagation(); removeTab(tab.id); }}>&times;</button>
							{/if}
						</button>
					{/each}
					<button class="add-tab-btn" onclick={(e) => { e.preventDefault(); addSpeakerTab(); }}>
						+ Add Speaker
					</button>
				</div>

				<!-- ACTIVE TAB CONTENT -->
				{#if activeTab}
					<div class="tab-content">
						
						<div class="speaker-selection-area">
							{#if activeSpeakerDetails}
								<div class="speaker-avatar-card">
									<img src={activeSpeakerDetails.imageUrl} alt={activeSpeakerDetails.name} class="avatar-large" />
									<div class="speaker-info">
										<strong class="speaker-name-large">{activeSpeakerDetails.name}</strong>
										<span class="muted">Resource Speaker</span>
									</div>
								</div>
							{/if}

							<div class="visual-picker-container">
							<label class="picker-label">
								{activeSpeakerDetails ? 'Change assigned speaker' : 'Select a speaker to evaluate'}
							</label>
							
							<div class="visual-speaker-picker">
								{#each availableSpeakers as speaker}
									{@const isSelected = activeTab.speakerId === speaker.id}
									{@const isAssignedElsewhere = tabs.some(t => t.speakerId === speaker.id && t.id !== activeTab.id)}
									
									<button
										class="speaker-card {isSelected ? 'selected' : ''} {isAssignedElsewhere ? 'disabled' : ''}"
										disabled={isAssignedElsewhere}
										onclick={(e) => { e.preventDefault(); activeTab.speakerId = speaker.id; }}
										aria-pressed={isSelected}
									>
										<img src={speaker.imageUrl} alt={speaker.name} class="picker-avatar" />
										<span class="picker-name">{speaker.name}</span>
										
										{#if isSelected}
											<div class="selected-badge">✓</div>
										{/if}
									</button>
								{/each}
							</div>
						</div>
						</div>

						<!-- Evaluation Matrix -->
						{#if activeTab.speakerId}
							<div class="matrix">
								{#each speakerItems as item}
									<div class="matrix-row">
										<div class="matrix-label">
											<span class="label-primary">{item.label}</span>
											<span class="label-secondary">{item.sub}</span>
										</div>
										<div class="rating-group">
											{#each [1, 2, 3, 4, 5] as v}
												<label class="rating-pill rating-val-{v}">
													<input
														type="radio"
														name={`rating_${activeTab.id}_${item.key}`}
														value={String(v)}
														bind:group={activeTab.ratings[item.key]}
													/>
													{v}
												</label>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="placeholder-text">Please select a speaker from the dropdown above to begin their evaluation.</p>
						{/if}
					</div>
				{/if}
			</div>
				<h4 class="form-subtitle" style="margin-top: 2rem; margin-bottom: 1rem; font-weight: 600;">
					Quality & Timeliness of Service
				</h4>
				<div class="matrix">
					{#each serviceItems as item}
						<div class="matrix-row">
							<div class="matrix-label">
								<span class="label-primary">{item.label}</span>
								<span class="label-secondary">{item.sub}</span>
							</div>
							<div class="rating-group">
								{#each [1, 2, 3, 4, 5] as v}
									<label class="rating-pill">
										<input
											type="radio"
											name={item.key}
											value={String(v)}
											bind:group={ratings[item.key]}
											required
										/>
										{v}
									</label>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section class="form-section">
				<h3>Part II. Other particulars</h3>
				<div class="matrix">
					{#each itemsPart2 as item}
						<div class="matrix-row">
							<div class="matrix-label">
								<span class="label-primary">{item.label}</span>
								<span class="label-secondary">{item.sub}</span>
							</div>
							<div class="rating-group">
								{#each [1, 2, 3, 4, 5] as v}
									<label class="rating-pill rating-val-{v}">
										<input
											type="radio"
											name={item.key}
											value={String(v)}
											bind:group={ratings[item.key]}
											required
										/>
										{v}
									</label>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section class="form-section">
				<h3>Open-ended questions</h3>
				<div class="field">
					<label for="q1">What was the most interesting thing you learned in this training?</label>
					<textarea id="q1" bind:value={q1} rows="3" required></textarea>
				</div>
				<div class="field">
					<label for="q2">What would have made the training session more effective?</label>
					<textarea id="q2" bind:value={q2} rows="3" required></textarea>
				</div>
				<div class="field">
					<label for="q3"
						>Do you have any additional suggestions/comments/inquiries? Please specify.</label
					>
					<textarea id="q3" bind:value={q3} rows="3" required></textarea>
				</div>
			</section>

			<button type="submit" class="btn-primary" disabled={isSubmitting}>
				{isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
			</button>
		</form>

		{#if formMessage}
			<div class="message">
				{formMessage}
			</div>
		{/if}
	{:else if currentView === 'already-submitted'}
		<h2>Evaluation Complete</h2>
		<p class="subtitle">
			An evaluation for <strong>{currentGuestName}</strong> ({guestId}) has already been recorded.
		</p>
		<p>Thank you for your participation!</p>
		<button class="btn-secondary" onclick={handleSignout}>Reset Session</button>
	{:else if currentView === 'success'}
		<h2>Thank You!</h2>
		<p class="subtitle">Your evaluation has been successfully submitted.</p>
		<p>We appreciate your feedback and participation in the seminar.</p>
		<button class="btn-secondary" onclick={handleSignout}>Back to Home</button>
	{/if}
</main>

<footer class="footer">
	<small>&copy; {new Date().getFullYear()} DTI. All rights reserved.</small>
</footer>

<style>
	.text-accent {
		color: var(--accent);
	}
	.message {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(148, 163, 184, 0.1);
		border-radius: 6px;
	}
	h4.form-subtitle {
		margin-top: 2rem;
		margin-bottom: 1rem;
		font-weight: 600;
	}
</style>
