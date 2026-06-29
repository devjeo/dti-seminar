<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let guestId = $state.raw('');
	let guestName = $state.raw('');
	let attendanceStatus = $state.raw('');
	let isSubmitting = $state(false);
	let deviceKey = '';

	onMount(async () => {
		// 1. Establish or retrieve the unique device signature
		deviceKey = localStorage.getItem('dti_device_key') || '';
		if (!deviceKey) {
			deviceKey = typeof crypto !== 'undefined' && crypto.randomUUID 
				? crypto.randomUUID() 
				: Math.random().toString(36).substring(2, 15);
			localStorage.setItem('dti_device_key', deviceKey);
		}

		// 2. Read the ID that your upcoming Registration page will save
		const storedId = localStorage.getItem('dti_locked_guest_id') || localStorage.getItem('dti_session_guest_id');
		
		if (storedId) {
			guestId = storedId;
			
			// 3. Silently fetch the guest's name to personalize the button
			try {
				const res = await fetch(`/api/guests?q=${encodeURIComponent(guestId)}`);
				if (res.ok) {
					const guests = await res.json();
					const match = guests.find((g: any) => g.guestId === storedId);
					if (match) {
						guestName = `${match.firstName} ${match.lastName}`;
					}
				}
			} catch (e) {
				console.error("Failed to load guest details");
			}
		}
	});

	async function recordAttendance() {
		if (!guestId) return;
		
		isSubmitting = true;
		attendanceStatus = 'Recording your attendance...';

		try {
			const response = await fetch('/api/attendance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ guestId, deviceKey })
			});

			if (response.ok) {
				attendanceStatus = 'Success! You are checked in.';
				localStorage.setItem('dti_session_guest_id', guestId); // Lock the session
				
				// Briefly show success before routing to the evaluation holding page
				setTimeout(() => goto('/'), 1500);
			} else {
				const err = await response.json();
				attendanceStatus = err.message || 'Could not verify attendance. Please see admin.';
				isSubmitting = false;
			}
		} catch (e) {
			attendanceStatus = 'Network error. Please try again.';
			isSubmitting = false;
		}
	}

	function clearSession() {
		localStorage.removeItem('dti_locked_guest_id');
		localStorage.removeItem('dti_session_guest_id');
		goto('/register');
	}
</script>

<svelte:head>
	<title>Attendance | DTI Seminar Portal</title>
</svelte:head>

<header class="dti-header">
	<div class="dti-title">
		<p class="dti-kicker">Seminar & Workshop</p>
		<h1>Creatives Awareness & Workshop Session for Domain Players</h1>
		<p class="dti-subtitle">DTI Seminar &amp; Workshop &mdash; Attendance</p>
	</div>
</header>

<main class="card attendance-card">
	<div class="icon-wrapper">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="status-icon">
			<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
			<circle cx="9" cy="7" r="4"/>
			<polyline points="16 11 18 13 22 9"/>
		</svg>
	</div>

	<h2 id="modeTitle">Guest Attendance</h2>

	{#if guestId}
		<!-- ONE-CLICK CHECK-IN STATE -->
		<p class="subtitle">
			Welcome back! Ready to record your arrival for today's seminar?
		</p>

		<div class="user-badge">
			<span class="user-name">{guestName || 'Registered Guest'}</span>
			<span class="user-id">ID: {guestId}</span>
		</div>

		<button 
			class="btn-primary huge-btn" 
			onclick={recordAttendance} 
			disabled={isSubmitting}
		>
			{isSubmitting ? 'Verifying...' : 'Tap to Check In'}
		</button>

		<p class="status-message" class:text-accent={attendanceStatus.includes('Success')} class:text-danger={attendanceStatus.includes('error') || attendanceStatus.includes('Could not')}>
			{attendanceStatus}
		</p>

		<button class="reset-link" onclick={clearSession} disabled={isSubmitting}>
			Not {guestName ? guestName.split(' ')[0] : 'you'}? Register a different user.
		</button>

	{:else}
		<!-- NO PROFILE FOUND STATE -->
		<p class="subtitle">
			We couldn't find a registered profile on this device. You must complete Step 1 before recording attendance.
		</p>

		<button class="btn-primary" onclick={() => goto('/register')}>
			Go to Walk-In Registration
		</button>
	{/if}
</main>

<footer class="footer">
	<small>&copy; {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date())} DTI. All rights reserved.</small>
</footer>

<style>
	.attendance-card {
		text-align: center;
		padding: 3rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.icon-wrapper {
		background: rgba(139, 0, 33, 0.1);
		border: 1px solid rgba(139, 0, 33, 0.2);
		width: 80px;
		height: 80px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.status-icon {
		width: 40px;
		height: 40px;
		color: var(--primary);
	}

	.user-badge {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1.25rem 2rem;
		border-radius: 16px;
		margin-bottom: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
		max-width: 400px;
	}

	.user-name {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.user-id {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-family: monospace;
		letter-spacing: 1px;
	}

	.huge-btn {
		padding: 1.25rem;
		font-size: 1.2rem;
		max-width: 400px;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.status-message {
		margin-top: 1.5rem;
		font-weight: 500;
		min-height: 1.5rem;
	}

	.text-accent { color: var(--accent); }
	.text-danger { color: var(--danger); }

	.reset-link {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.9rem;
		margin-top: 1.5rem;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: transparent;
		transition: all 0.2s ease;
	}

	.reset-link:hover {
		color: var(--text-main);
		text-decoration-color: var(--text-muted);
	}

	.reset-link:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>