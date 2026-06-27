<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let manualId = $state.raw('');
	let attendanceStatus = $state.raw('');
	let lockedGuestId = $state.raw('');
	let selectedGuestForConfirmation: any = $state.raw(null);
	let deviceKey = '';

	let guests: any[] = $state.raw([]);
	let filteredGuests = $derived(
		guests.filter(
			(s) =>
				(s.firstName && s.firstName.toLowerCase().includes(manualId.toLowerCase())) ||
				(s.lastName && s.lastName.toLowerCase().includes(manualId.toLowerCase())) ||
				s.guestId.toLowerCase().includes(manualId.toLowerCase())
		)
	);

	onMount(async () => {
		// Device key handling
		deviceKey = localStorage.getItem('dti_device_key') || '';
		if (!deviceKey) {
			if (typeof crypto !== 'undefined' && crypto.randomUUID) {
				deviceKey = crypto.randomUUID();
			} else {
				deviceKey =
					Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			}
			localStorage.setItem('dti_device_key', deviceKey);
		}

		// Check for locked device first
		lockedGuestId = localStorage.getItem('dti_locked_guest_id') || '';

		// active session check
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

		// If no active session but device is locked, try to restore session/check status for locked user
		if (lockedGuestId) {
			await recordAttendanceById(lockedGuestId);
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
		manualId = `${guest.firstName} ${guest.lastName}`; // Fill input for better UX
		selectedGuestForConfirmation = guest;
	}

	function confirmAttendance() {
		if (selectedGuestForConfirmation) {
			recordAttendanceById(selectedGuestForConfirmation.guestId);
			selectedGuestForConfirmation = null;
		}
	}

	function cancelConfirmation() {
		selectedGuestForConfirmation = null;
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
					<button class="btn-primary" onclick={confirmAttendance}>Confirm & Lock</button>
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
				placeholder={lockedGuestId ? 'Device Locked' : 'Search for your name...'}
				autocomplete="off"
				disabled={!!lockedGuestId}
			/>

			{#if manualId && filteredGuests.length > 0}
				<ul class="suggestions">
					{#each filteredGuests.slice(0, 5) as s}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
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
	.text-accent {
		color: var(--accent);
	}
	.text-danger {
		color: var(--danger);
	}

	.autocomplete-field {
		position: relative;
	}

	.suggestions {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: #0b1020;
		border: 1px solid rgba(148, 163, 184, 0.3);
		border-radius: 8px;
		z-index: 10;
		max-height: 200px;
		overflow-y: auto;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
	}

	.suggestions li {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.1);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		transition: background 0.2s;
	}

	.suggestions li:hover {
		background: rgba(148, 163, 184, 0.1);
	}

	.confirmation-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(4px);
	}

	.confirmation-modal {
		background: #1e293b;
		padding: 2rem;
		border-radius: 12px;
		max-width: 400px;
		width: 90%;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(148, 163, 184, 0.1);
	}

	.confirmation-modal h3 {
		margin-top: 0;
		color: var(--text-primary);
	}

	.selected-guest {
		background: rgba(15, 23, 42, 0.6);
		padding: 1rem;
		border-radius: 8px;
		margin: 1rem 0;
		border: 1px solid var(--accent);
	}

	.guest-name {
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--accent);
	}

	.guest-details {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.guest-id {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
		font-family: monospace;
	}

	.warning-box {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
		color: #fca5a5;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}
</style>
