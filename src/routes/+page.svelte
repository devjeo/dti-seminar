<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	let { data } = $props();
	const event = $derived(data?.event || null);

	// --- NEW CLOCK STATE ---
	let currentTime = $state(new Date());
	let clockInterval: ReturnType<typeof setInterval>;

	// Derive the Manila formatted time
	const manilaTime = $derived(new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Manila',
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit',
		hour12: true
	}).format(currentTime));

	const eventState = $derived(data?.eventState || 'none'); // 'ongoing', 'upcoming', 'past', 'none'

	const isOngoing = $derived(eventState === 'ongoing');

	// Schedule States
	let attStatus = $state('checking'); 
	let attMessage = $state('Checking schedule...');
	let isEvalOpen = $state(false);
	let evalMessage = $state('Checking schedule...');

	// Tracking the registered and checked-in user on this device
	let localGuestId = $state('');
	let isCheckedIn = $state(false);
	
	// Modal & Timer State
	let showDeleteModal = $state(false);
	let deleteCountdown = $state(0);
	let countdownInterval: ReturnType<typeof setInterval>;

	// --- NEW MODAL FUNCTIONS ---
	function openDeleteModal() {
		showDeleteModal = true;
		deleteCountdown = 3; // 3-second safety timer
		clearInterval(countdownInterval);
		
		countdownInterval = setInterval(() => {
			deleteCountdown -= 1;
			if (deleteCountdown <= 0) {
				clearInterval(countdownInterval);
			}
		}, 1000);
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		clearInterval(countdownInterval);
	}

	function deleteProfile() {
		localStorage.removeItem('dti_locked_guest_id');
		localStorage.removeItem('dti_session_guest_id');
		localGuestId = '';
		isCheckedIn = false;
		closeDeleteModal();
	}
	
	// --- UPDATE navStep1 TO USE THE NEW FUNCTION ---
	function navStep1(e: Event) {
		e.preventDefault();
		if (localGuestId) {
			openDeleteModal(); // Replaced showDeleteModal = true
		} else if (attStatus === 'open') {
			goto('/register');
		}
	}

	onMount(async () => {
		// 1. Check device storage for registration and check-in status
		localGuestId = localStorage.getItem('dti_locked_guest_id') || '';
		const sessionGuestId = localStorage.getItem('dti_session_guest_id');
		
		if (localGuestId && sessionGuestId === localGuestId) {
			isCheckedIn = true;
		}

		// 2. Fetch system schedule and apply the event date lock
		try {
			const res = await fetch('/api/status');
			if (res.ok) {
				const statusData = await res.json();
				
				// Apply the lock: Override status if the event is not today
				if (!isOngoing) {
					attStatus = 'closed';
					attMessage = 'This event is not scheduled for today.';
					isEvalOpen = false;
					evalMessage = 'This event is not scheduled for today.';
				} else {
					attStatus = statusData.attendance.status;
					attMessage = statusData.attendance.message;
					isEvalOpen = statusData.evaluation.isOpen;
					evalMessage = statusData.evaluation.message;
				}
			} else {
				attStatus = 'closed';
				attMessage = 'System schedule unavailable.';
			}
		} catch (error) {
			attStatus = 'closed';
			attMessage = 'Network error checking schedule.';
		}

		clockInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});
	onDestroy(() => {
		if (clockInterval) clearInterval(clockInterval);
	});
</script>

<svelte:head>
	<title>Welcome | DTI Seminar Portal</title>
</svelte:head>

{#if showDeleteModal}
	<div class="modal-overlay animation-fade-in">
		<div class="modal-card animation-pop-up">
			
			<div class="modal-icon text-danger">
				{@render IconWarning()}
			</div>
			
			<h3>Reset Profile?</h3>
			<p>This will remove the current registered profile from this device. Are you sure you want to register a new guest?</p>
			
			<div class="modal-actions">
				<button class="btn-secondary" onclick={closeDeleteModal}>Cancel</button>
				<button 
					class="btn-primary" 
					style={deleteCountdown > 0 ? '' : 'background: var(--danger); border-color: var(--danger);'}
					disabled={deleteCountdown > 0} 
					onclick={deleteProfile}
				>
					{deleteCountdown > 0 ? `Yes, Delete (${deleteCountdown}s)` : 'Yes, Delete'}
				</button>
			</div>
			
		</div>
	</div>
{/if}

<div class="kiosk-container">
	<header class="app-header">
		<div class="logo-container">
			<div class="logo-box"><img src="/assets/logo_cnsc.png" alt="CNSC Logo" /></div>
			<div class="logo-box"><img src="/assets/ccms_logo.png" alt="CCMS Logo" /></div>
		</div>
		<div class="poster-container animation-pop-up">
			<img src="/assets/theme.jpg" alt="Seminar Theme Poster" />
		</div>
	</header>

	<main class="glass-card animation-pop-up" style="animation-delay: 0.1s;">
		{#if eventState === 'ongoing'}
			<div class="event-banner">
				<span class="pulse-badge">Live Event</span>
				<h1>{event.eventName}</h1>
				<p class="venue-text">{@render IconMapPin()} {event.venue || 'Main Hall'}</p>
				{#if event.date}
					<p class="venue-text" style="margin-top: 0.5rem; font-weight: 500;">
						{@render IconCalendar()} {new Date(event.date).toLocaleDateString('en-US', { 
							weekday: 'long', 
							year: 'numeric', 
							month: 'long', 
							day: 'numeric',
							timeZone: 'Asia/Manila' 
						})}
					</p>
				{/if}
			</div>

		{:else if eventState === 'upcoming'}
			<div class="event-banner">
				<span class="pulse-badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-color: rgba(59, 130, 246, 0.3);">
					Upcoming Event
				</span>
				<h1>{event.eventName}</h1>
				<p class="venue-text">{@render IconMapPin()} {event.venue || 'Main Hall'}</p>
				{#if event.date}
					<p class="venue-text" style="margin-top: 0.5rem; font-weight: 500;">
						{@render IconCalendar()} {new Date(event.date).toLocaleDateString('en-US', { 
							weekday: 'long', 
							year: 'numeric', 
							month: 'long', 
							day: 'numeric',
							timeZone: 'Asia/Manila' 
						})}
					</p>
				{/if}
			</div>

		{:else if eventState === 'past'}
			<div class="event-banner">
				<span class="pulse-badge" style="background: rgba(148, 163, 184, 0.15); color: var(--text-muted); border-color: rgba(148, 163, 184, 0.3);">
					Last Event
				</span>
				<h1>{event.eventName}</h1>
				<p class="venue-text">{@render IconMapPin()} {event.venue || 'Main Hall'}</p>
				{#if event.date}
					<p class="venue-text" style="margin-top: 0.5rem; font-weight: 500;">
						{@render IconCalendar()} {new Date(event.date).toLocaleDateString('en-US', { 
							weekday: 'long', 
							year: 'numeric', 
							month: 'long', 
							day: 'numeric',
							timeZone: 'Asia/Manila' 
						})}
					</p>
				{/if}
			</div>

		{:else}
			<div class="event-banner">
				<span class="pulse-badge" style="background: rgba(255,255,255,0.1); color: var(--text-muted); border-color: rgba(255,255,255,0.2);">Standby</span>
				<h1>DTI Seminar & Workshop</h1>
				<p class="venue-text">Welcome to the portal</p>
			</div>
		{/if}

		<div class="action-grid">
			
			<a 
				href={localGuestId ? "#" : (attStatus === 'open' ? "/register" : "#")} 
				class="action-card"
				class:primary-action={!localGuestId && attStatus === 'open'}
				class:completed-action={!!localGuestId}
				class:locked={!localGuestId && attStatus !== 'open'}
				onclick={(e) => { 
					if (localGuestId) { e.preventDefault(); showDeleteModal = true; } 
					else if (attStatus !== 'open') { e.preventDefault(); }
				}}
			>
				<div class="step-indicator">Step 1</div>
				<div class="icon">
					{#if localGuestId} {@render IconCheckCircle()}
					{:else if attStatus === 'open'} {@render IconUserPlus()}
					{:else if attStatus === 'not_started'} {@render IconClock()}
					{:else} {@render IconLock()}
					{/if}
				</div>
				
				<h2>Registration</h2>
				
				{#if localGuestId}
					<p>Profile saved on this device. Click here to reset or delete.</p>
					<span class="cta-text text-green">Registered &check;</span>
				{:else if attStatus === 'open'}
					<p>New guest? Create your profile and log your arrival.</p>
					<span class="cta-text text-accent">Register Now &rarr;</span>
				{:else if attStatus === 'not_started'}
					<p>{attMessage}</p>
					<span class="cta-text text-muted">Not Yet Open</span>
				{:else}
					<p>{attMessage}</p>
					<span class="cta-text text-muted">Currently Closed</span>
				{/if}
			</a>

			<a 
				href={localGuestId && !isCheckedIn && attStatus === 'open' ? "/attendance" : "#"} 
				class="action-card"
				class:primary-action={!!localGuestId && !isCheckedIn && attStatus === 'open'}
				class:secondary-action={!localGuestId || attStatus !== 'open'}
				class:completed-action={isCheckedIn}
				class:locked={!localGuestId || (attStatus !== 'open' && !isCheckedIn)}
				onclick={(e) => { if(!localGuestId || isCheckedIn || attStatus !== 'open') e.preventDefault(); }}
			>
				<div class="step-indicator">Step 2</div>
				<div class="icon">
					{#if isCheckedIn} {@render IconCheckCircle()}
					{:else if !localGuestId} {@render IconLock()}
					{:else if attStatus === 'open'} {@render IconUserCheck()}
					{:else if attStatus === 'not_started'} {@render IconClock()}
					{:else} {@render IconLock()}
					{/if}
				</div>
				
				<h2>Record Attendance</h2>
				
				{#if isCheckedIn}
					<p>You have successfully logged your attendance for today's event.</p>
					<span class="cta-text text-green">Checked In &check;</span>
				{:else if !localGuestId}
					<p>Please complete Step 1 (Registration) first to unlock attendance.</p>
					<span class="cta-text text-muted">Requires Step 1</span>
				{:else if attStatus === 'open'}
					<p>You are registered! Tap here to officially check in.</p>
					<span class="cta-text text-accent">Enter Portal &rarr;</span>
				{:else if attStatus === 'not_started'}
					<p>{attMessage}</p>
					<span class="cta-text text-muted">Not Yet Open</span>
				{:else}
					<p>{attMessage}</p>
					<span class="cta-text text-muted">Currently Closed</span>
				{/if}
			</a>

			<a 
				href={isCheckedIn && isEvalOpen ? "/evaluation" : "#"} 
				class="action-card" 
				class:primary-action={isCheckedIn && isEvalOpen}
				class:secondary-action={!isCheckedIn || !isEvalOpen}
				class:locked={!isCheckedIn || !isEvalOpen}
				onclick={(e) => { if(!isCheckedIn || !isEvalOpen) e.preventDefault(); }}
			>
				<div class="step-indicator">Step 3</div>
				<div class="icon">
					{#if !isCheckedIn || !isEvalOpen} {@render IconLock()}
					{:else} {@render IconFileEdit()}
					{/if}
				</div>

				<h2>Submit Evaluation</h2>
				{#if !isCheckedIn}
					<p>Please complete Step 2 (Attendance) first to unlock the evaluation.</p>
					<span class="cta-text text-muted">Requires Step 2</span>
				{:else if isEvalOpen}
					<p>You are all set! Share your feedback to complete the seminar.</p>
					<span class="cta-text text-accent">Start Evaluation &rarr;</span>
				{:else}
					<p>{evalMessage}</p>
					<span class="cta-text text-muted">Currently Closed</span>
				{/if}
			</a>
		</div>
	</main>

	<footer class="app-footer animation-fade-in" style="animation-delay: 0.2s;">
        <div class="clock-container">
            <span><strong>{manilaTime}</strong></span>
        </div>
    </footer>
</div>

{#snippet IconCheckCircle()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
	<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
	<polyline points="22 4 12 14.01 9 11.01"/>
</svg>
{/snippet}

{#snippet IconUserPlus()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
{/snippet}

{#snippet IconUserCheck()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
{/snippet}

{#snippet IconFileEdit()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/></svg>
{/snippet}

{#snippet IconClock()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
{/snippet}

{#snippet IconLock()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
{/snippet}

{#snippet IconWarning()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
	<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
	<line x1="12" x2="12" y1="9" y2="13"/>
	<line x1="12" x2="12.01" y1="17" y2="17"/>
</svg>
{/snippet}

{#snippet IconMapPin()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 1rem; height: 1rem; vertical-align: middle; margin-right: 0.25rem;">
	<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
	<circle cx="12" cy="10" r="3"/>
</svg>
{/snippet}

{#snippet IconCalendar()}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 1rem; height: 1rem; vertical-align: middle; margin-right: 0.25rem;">
	<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
	<line x1="16" x2="16" y1="2" y2="6"/>
	<line x1="8" x2="8" y1="2" y2="6"/>
	<line x1="3" x2="21" y1="10" y2="10"/>
</svg>
{/snippet}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

	:root {
		--bg-color: #061224;
		--card-bg: #0b1d3a;
		--card-border: #1e365d;
		--text-main: #f8fafc;
		--text-muted: #94a3b8;
		--accent-color: #ffd600; 
		--accent-green: #10b981;
		--primary: #650000; 
		--danger: #ef4444;
		--border-subtle: rgba(148, 163, 184, 0.1);
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Inter', -apple-system, sans-serif;
		background: var(--bg-color);
		color: var(--text-main);
		min-height: 100vh;
	}

	/* Modal Styling */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		z-index: 1000;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1rem;
	}

	.modal-card {
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		padding: 2.5rem;
		border-radius: 20px;
		max-width: 450px;
		width: 100%;
		text-align: center;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
	}

	.modal-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.text-danger { color: var(--danger); }

	.modal-card h3 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		color: var(--text-main);
	}

	.modal-card p {
		color: var(--text-muted);
		line-height: 1.5;
		margin-bottom: 2rem;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn-secondary, .btn-primary {
		padding: 0.8rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: all 0.2s;
	}

	.btn-secondary {
		background: transparent;
		border: 1px solid var(--border-subtle);
		color: var(--text-muted);
	}

	.btn-secondary:hover {
		background: rgba(255,255,255,0.05);
		color: var(--text-main);
	}

	.btn-primary {
		color: white;
	}

	/* Kiosk Styling */
	.kiosk-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 90vh;
		padding: 2rem 1rem;
		max-width: 1000px; 
		margin: 0 auto;
	}

	.app-header {
		margin-bottom: 2rem;
		width: 100%;
	}

	.logo-container {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
	}

	.logo-box {
		width: 75px;
		height: 75px;
	}

	.logo-box img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.poster-container {
		width: 100%;
		margin-top: 2rem;
		border-radius: 16px;
		overflow: hidden;
		border: 1px solid var(--border-subtle);
		box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.5);
		background: rgba(11, 16, 32, 0.4);
	}

	.poster-container img {
		width: 100%;
		height: auto;
		display: block;
		object-fit: cover;
	}

	.glass-card {
		background: rgba(11, 16, 32, 0.6);
		backdrop-filter: blur(16px);
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		padding: 2.5rem;
		width: 100%;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.event-banner {
		text-align: center;
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.pulse-badge {
		display: inline-block;
		background: rgba(16, 185, 129, 0.15);
		color: var(--accent-green);
		border: 1px solid rgba(16, 185, 129, 0.3);
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 1rem;
	}

	.event-banner h1 {
		font-size: 1.8rem;
		color: var(--text-main);
		margin: 0 0 0.5rem 0;
		line-height: 1.3;
	}

	.venue-text {
		color: var(--text-muted);
		font-size: 1rem;
		margin: 0;
	}

	.action-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	@media (max-width: 850px) {
		.action-grid {
			grid-template-columns: 1fr;
		}
	}

	.action-card {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 2rem 1.5rem;
		border-radius: 16px;
		text-decoration: none;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
	}

	/* PRIMARY: Solid Maroon Gradient */
	.primary-action {
		background: linear-gradient(135deg, #8B0021 0%, #5c0016 100%);
		border: 1px solid #b81433;
		box-shadow: 0 4px 15px rgba(139, 0, 33, 0.3);
	}

	.primary-action:hover:not(.locked) {
		background: linear-gradient(135deg, #a80028 0%, #7a001d 100%);
		border-color: var(--accent-color);
		transform: translateY(-4px);
		box-shadow: 0 10px 25px rgba(139, 0, 33, 0.5), 0 0 15px rgba(255, 214, 0, 0.3);
	}

	.primary-action p, 
	.primary-action .step-indicator,
	.primary-action .cta-text {
		color: rgba(255, 255, 255, 0.85) !important;
	}

	.primary-action h2 {
		color: #ffffff;
	}

	/* SECONDARY: Glassmorphism */
	.secondary-action {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.secondary-action:hover:not(.locked) {
		background: rgba(255, 255, 255, 0.06);
		transform: translateY(-4px);
		border-color: rgba(255, 255, 255, 0.15);
	}

	/* COMPLETED: Soft Green / Muted State */
	.completed-action {
		background: rgba(16, 185, 129, 0.05);
		border: 1px solid rgba(16, 185, 129, 0.2);
		cursor: pointer;
	}

	.completed-action:hover {
		background: rgba(16, 185, 129, 0.08);
		border-color: rgba(16, 185, 129, 0.4);
		transform: translateY(-2px);
	}
	
	.completed-action .icon svg {
		color: var(--accent-green);
	}

	.text-green { color: var(--accent-green); }

	/* LOCKED STATE */
	.action-card.locked {
		opacity: 0.6;
		cursor: not-allowed;
		filter: grayscale(80%);
		border-color: rgba(148, 163, 184, 0.1);
	}

	.action-card.locked .text-accent {
		color: var(--text-muted);
	}

	.step-indicator {
		position: absolute;
		top: 1rem;
		right: 1rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-muted);
		letter-spacing: 1px;
	}

	.icon {
		margin-bottom: 1.25rem;
		display: inline-flex;
	}

	.icon svg {
		width: 42px;
		height: 42px;
		color: var(--text-main);
		transition: color 0.3s ease;
	}
	
	.primary-action:not(.locked) .icon svg {
		color: var(--accent-color);
	}

	.action-card h2 {
		color: var(--text-main);
		font-size: 1.25rem;
		margin: 0 0 0.5rem 0;
	}

	.action-card p {
		color: var(--text-muted);
		font-size: 0.9rem;
		line-height: 1.4;
		margin: 0 0 1.5rem 0;
		flex-grow: 1;
	}

	.cta-text {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.text-accent {
		color: var(--accent-color);
	}

	.text-muted {
		color: var(--text-muted);
	}

	.animation-pop-up {
		animation: popUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		animation-fill-mode: both;
	}
	.animation-fade-in {
		animation: fadeIn 0.3s ease;
	}

	@keyframes popUp {
		from { opacity: 0; transform: scale(0.95) translateY(20px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.modal-icon {
		margin-bottom: 1rem;
		display: flex;
		justify-content: center;
	}

	/* This strictly controls the SVG size so it doesn't get massive */
	.modal-icon svg {
		width: 48px; 
		height: 48px;
	}

	/* --- CLOCK FOOTER STYLES --- */
.app-footer {
    margin-top: 2rem;
    width: 100%;
    display: flex;
    justify-content: center;
}

.clock-container {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(11, 16, 32, 0.6);
    border: 1px solid var(--border-subtle);
    padding: 0.75rem 1.5rem;
    border-radius: 50px;
    color: var(--text-muted);
    font-size: 0.95rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.clock-icon svg {
    width: 18px;
    height: 18px;
    color: var(--accent-color);
}

.clock-container strong {
    color: var(--text-main);
    font-weight: 700;
    letter-spacing: 1px;
}
</style>
