<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let manualId = $state.raw('');
	let attendanceStatus = $state.raw('');
	let lockedGuestId = $state.raw('');
	let selectedGuestForConfirmation: any = $state.raw(null);
	let deviceKey = '';

	let confirmCountdown = $state(0);
	let timerInterval: ReturnType<typeof setInterval>;

	let guests: any[] = $state.raw([]); 
	let searchTimeout: ReturnType<typeof setTimeout>;

	let filteredGuests = $derived(
		guests.filter(
			(s) =>
				(s.firstName && s.firstName.toLowerCase().includes(manualId.toLowerCase())) ||
				(s.lastName && s.lastName.toLowerCase().includes(manualId.toLowerCase())) ||
				s.guestId.toLowerCase().includes(manualId.toLowerCase())
		)
	);

	async function handleSearchInput() {
		// Clear the previous timer so we don't spam the API while they type
		clearTimeout(searchTimeout);

		// If input is empty or too short, clear results immediately
		if (!manualId || manualId.length < 2) {
			guests = [];
			return;
		}

		// Wait 300ms after they stop typing before hitting the database
		searchTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/guests?q=${encodeURIComponent(manualId)}`);
				if (res.ok) {
					guests = await res.json();
				}
			} catch (e) {
				console.error("Search failed:", e);
			}
		}, 300);
	}

	onMount(async () => {
		// Device key handling
		deviceKey = localStorage.getItem('dti_device_key') || '';
		if (!deviceKey) {
			if (typeof crypto !== 'undefined' && crypto.randomUUID) {
				deviceKey = crypto.randomUUID();
			} else {
				deviceKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			}
			localStorage.setItem('dti_device_key', deviceKey);
		}

		// Check for locked device first
		lockedGuestId = localStorage.getItem('dti_locked_guest_id') || '';
		const storedId = localStorage.getItem('dti_session_guest_id');

		// Load guests first
		try {
			const res = await fetch('/api/guests');
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) guests = data;
			}
		} catch (e) {
			console.error(e);
		}

		// If user was already evaluating, redirect them back
		if (storedId) {
			goto('/evaluation');
			return;
		}

		// If no active session but device is locked, try to restore session
		if (lockedGuestId) {
			await recordAttendanceById(lockedGuestId);
		} 
		// THE NEW QR CODE URL CHECK
		else {
			const urlId = $page.url.searchParams.get('id');
			if (urlId && guests.length > 0) {
				const match = guests.find((g) => g.guestId === urlId);
				if (match) {
					selectGuest(match);
				} else {
					attendanceStatus = 'QR Code invalid: Guest ID not found.';
				}
			}
		}
	});

	async function recordAttendanceById(id: string) {
		attendanceStatus = 'Recording attendance...';

		try {
			const response = await fetch('/api/attendance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ guestId: id, deviceKey })
			});

			if (response.ok) {
				localStorage.setItem('dti_locked_guest_id', id);
				localStorage.setItem('dti_session_guest_id', id);
				lockedGuestId = id;
				goto('/evaluation');
			} else {
				const err = await response.json();
				attendanceStatus = err.message || 'Could not verify Guest ID. Please try again.';
			}
		} catch (e) {
			attendanceStatus = 'Network error. Please try again.';
		}
	}

	function selectGuest(guest: any) {
		if (!guest) return;
		if (lockedGuestId && guest.guestId !== lockedGuestId) {
			attendanceStatus = 'This device is locked to another guest.';
			return;
		}
		manualId = `${guest.firstName} ${guest.lastName}`; 
		selectedGuestForConfirmation = guest;

		// Start the 3-second countdown
		confirmCountdown = 3;
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			confirmCountdown -= 1;
			if (confirmCountdown <= 0) clearInterval(timerInterval);
		}, 1000);
	}

	function confirmAttendance() {
		if (selectedGuestForConfirmation && confirmCountdown <= 0) {
			recordAttendanceById(selectedGuestForConfirmation.guestId);
			selectedGuestForConfirmation = null;
			if (timerInterval) clearInterval(timerInterval);
		}
	}

	function cancelConfirmation() {
		selectedGuestForConfirmation = null;
		if (timerInterval) clearInterval(timerInterval);
	}

	async function handleManualAttendance(e: Event) {
		e.preventDefault();
		if (!manualId) return;

		// If typed ID matches a name exactly, or ID exactly
		const lowerVal = manualId.toLowerCase();
		const match = guests.find(
			(s) =>
				s.guestId === manualId ||
				`${s.firstName} ${s.lastName}`.toLowerCase() === lowerVal ||
				s.lastName.toLowerCase() === lowerVal
		);

		if (lockedGuestId) {
			// If locked, ensure the input matches the locked ID/Name
			if (match && match.guestId !== lockedGuestId) {
				attendanceStatus = 'This device is locked to another guest.';
				return;
			}
			if (!match && manualId !== lockedGuestId) {
				attendanceStatus = 'This device is locked to another guest.';
				return;
			}
		}

		if (match) {
			selectedGuestForConfirmation = match;
		} else {
			// Assume invalid or manual ID
			attendanceStatus = 'Guest not found. Please contact admin to register.';
		}
	}
</script>

<svelte:head>
	<title>DTI Attendance</title>
</svelte:head>

<header class="dti-header">
	<div class="dti-title">
		<p class="dti-kicker">Seminar & Workshop</p>
		<h1>Empowering Collaboration, Active Participation, and Professional Engagement Through Digital Tools</h1>
		<p class="dti-subtitle">DTI Seminar &amp; Workshop &mdash; Attendance</p>
	</div>
</header>

<main class="card">
	{#if selectedGuestForConfirmation}
		<div class="confirmation-overlay">
			<div class="confirmation-modal">
				<h3>Confirm Attendance</h3>
				<p>Are you sure you want to record attendance for:</p>

				<div class="selected-guest">
					<div class="guest-name">
						{selectedGuestForConfirmation.firstName}
						{selectedGuestForConfirmation.lastName}
					</div>
					{#if selectedGuestForConfirmation.company}
						<div class="guest-details">{selectedGuestForConfirmation.company}</div>
					{/if}
					<div class="guest-id">{selectedGuestForConfirmation.guestId}</div>
				</div>

				<div class="warning-box">
					<span class="warning-icon">⚠️</span>
					<p>Doing this attendance will lock this name on this device.</p>
				</div>

				<div class="actions">
					<button class="btn-secondary" onclick={cancelConfirmation}>Cancel</button>
					<button 
						class="btn-primary" 
						onclick={confirmAttendance} 
						disabled={confirmCountdown > 0}
					>
						{confirmCountdown > 0 ? `Wait (${confirmCountdown}s)...` : 'Confirm & Lock'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<h2 id="modeTitle">Guest Attendance</h2>

	<p
		class="subtitle"
		class:text-accent={attendanceStatus && !attendanceStatus.includes('Could not')}
		class:text-danger={attendanceStatus && attendanceStatus.includes('Could not')}
	>
		{attendanceStatus || 'Search for your name to record your attendance.'}
		{#if lockedGuestId}
			<br /><small class="muted">Device locked to current guest.</small>
		{/if}
	</p>

	<form class="form" onsubmit={handleManualAttendance} autocomplete="off">
		<div class="field autocomplete-field">
			<label for="manualId">Find your Name or ID</label>
			<input
				id="manualId"
				type="text"
				bind:value={manualId}
				oninput={handleSearchInput}
				placeholder={lockedGuestId ? 'Device Locked' : 'Search for your name...'}
				autocomplete="off"
				disabled={!!lockedGuestId}
			/>

			{#if manualId && guests.length > 0}
				<ul class="suggestions">
					{#each guests as s}
						<li onclick={() => selectGuest(s)}>
							<strong>{s.firstName} {s.lastName}</strong>
							<small>{s.company || s.guestId}</small>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<button type="submit" class="btn-primary" disabled={!!lockedGuestId}>Record Attendance</button>
	</form>
</main>

<footer class="footer">
	<small>&copy; {new Date().getFullYear()} DTI. All rights reserved.</small>
</footer>

<style>
	.btn-primary:disabled {
		background: rgba(79, 70, 229, 0.2); /* Muted primary color */
		color: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(79, 70, 229, 0.3);
		cursor: wait;
		transform: none;
		box-shadow: none;
	}
	.text-accent {
		color: var(--accent);
	}
	.text-danger {
		color: var(--danger);
	}

	.autocomplete-field {
		position: relative;
		margin-bottom: 1.5rem;
	}

	.autocomplete-field input {
		width: 100%;
		padding: 1rem 1.25rem;
		font-size: 1.1rem;
		background: rgba(15, 23, 42, 0.4);
		border: 2px solid rgba(148, 163, 184, 0.2);
		border-radius: 12px;
		color: var(--text-main);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.autocomplete-field input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 20px rgba(79, 70, 229, 0.2);
		background: rgba(15, 23, 42, 0.8);
	}

	.suggestions {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0.5rem;
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: rgba(11, 16, 32, 0.85); /* Translucent */
		backdrop-filter: blur(12px); /* Glassmorphism */
		border: 1px solid rgba(148, 163, 184, 0.15);
		border-radius: 12px;
		z-index: 10;
		max-height: 250px;
		overflow-y: auto;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
		animation: slideDown 0.2s ease-out;
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.suggestions li {
		padding: 0.85rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		transition: all 0.2s ease;
	}

	.suggestions li:hover {
		background: rgba(79, 70, 229, 0.15); /* Primary tint on hover */
		padding-left: 1.25rem; /* Slight indentation micro-interaction */
	}

	.suggestions li strong {
		color: var(--text-main);
		font-size: 1.05rem;
	}

	.suggestions li small {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.confirmation-overlay {
		position: fixed;
		inset: 0; /* Shorthand for top, right, bottom, left */
		background: rgba(2, 6, 23, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(8px);
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.confirmation-modal {
		background: var(--bg-elevated);
		padding: 2.5rem 2rem;
		border-radius: 16px;
		max-width: 420px;
		width: 90%;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-top: 4px solid var(--primary); /* High contrast structural anchor */
		text-align: center;
		animation: popUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes popUp {
		from { opacity: 0; transform: scale(0.95) translateY(10px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	.confirmation-modal h3 {
		margin-top: 0;
		font-size: 1.4rem;
		color: var(--text-main);
		margin-bottom: 0.5rem;
	}

	.confirmation-modal > p {
		color: var(--text-muted);
		font-size: 0.95rem;
		margin-bottom: 1.5rem;
	}

	.selected-guest {
		background: rgba(255, 255, 255, 0.03);
		padding: 1.25rem;
		border-radius: 12px;
		margin: 1.5rem 0;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.guest-name {
		font-weight: 700;
		font-size: 1.2rem;
		color: var(--text-main);
	}

	.warning-box {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		text-align: left;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		font-size: 0.85rem;
		color: #fca5a5;
		line-height: 1.4;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}
</style>
