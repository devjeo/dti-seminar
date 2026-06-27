<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let form = $state({
		firstName: '',
		lastName: '',
		company: '',
		email: ''
	});

	let isSubmitting = $state(false);
	let errorMessage = $state('');

	onMount(() => {
		// If they already have an active session, push them to the evaluation
		const storedId = localStorage.getItem('dti_session_guest_id');
		if (storedId) {
			goto('/evaluation');
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;
		errorMessage = '';

		try {
			// Hit the POST endpoint we created earlier
			const res = await fetch('/api/guests', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			});

			if (res.ok) {
				const data = await res.json();
				
				// 1. Lock the device to this new guest
				localStorage.setItem('dti_locked_guest_id', data.guest.guestId);
				
				// 2. Automatically record their attendance
				await fetch('/api/attendance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ 
						guestId: data.guest.guestId,
						deviceKey: localStorage.getItem('dti_device_key') 
					})
				});

				// 3. Start their session and send them to the evaluation
				localStorage.setItem('dti_session_guest_id', data.guest.guestId);
				goto('/evaluation');
			} else {
				const err = await res.json();
				errorMessage = err.error || 'Failed to register. Please see an administrator.';
			}
		} catch (error) {
			errorMessage = 'Network error. Please check your connection.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Walk-In Registration | DTI</title>
</svelte:head>

<main class="register-container">
	<div class="glass-card animation-pop-up">
		<div class="card-header">
			<h2>Walk-In Registration</h2>
			<p>Please enter your details to register for the seminar and record your attendance.</p>
		</div>

		<form class="form" onsubmit={handleSubmit} autocomplete="off">
			<div class="field-group">
				<div class="field">
					<label for="firstName">First Name <span class="text-accent">*</span></label>
					<input id="firstName" type="text" bind:value={form.firstName} required placeholder="Juan" />
				</div>
				<div class="field">
					<label for="lastName">Last Name <span class="text-accent">*</span></label>
					<input id="lastName" type="text" bind:value={form.lastName} required placeholder="Dela Cruz" />
				</div>
			</div>

			<div class="field">
				<label for="company">Company / LGU / Organization</label>
				<input id="company" type="text" bind:value={form.company} placeholder="Optional" />
			</div>

			<div class="field">
				<label for="email">Email Address</label>
				<input id="email" type="email" bind:value={form.email} placeholder="Optional" />
			</div>

			{#if errorMessage}
				<div class="error-box">
					{errorMessage}
				</div>
			{/if}

			<button type="submit" class="btn-primary" disabled={isSubmitting || !form.firstName || !form.lastName}>
				{#if isSubmitting}
					<svg class="btn-spinner" viewBox="0 0 50 50">
						<circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
					</svg>
					Registering...
				{:else}
					Register & Continue
				{/if}
			</button>
		</form>
	</div>
</main>

<style>
	/* =========================================
	   Registration Specific Layout
	   ========================================= */
	/* Ensure the page background is painted immediately, even before
	   the card's entrance animation runs. Without this, if the global
	   layout's background hasn't applied yet, you get a flash of
	   whatever the browser default (white) is. Swap var(--bg-base) for
	   whatever your actual root background variable is called. */
	:global(html),
	:global(body) {
		background: var(--bg-base, #0b1020);
	}

	.register-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 80vh;
		padding: 1rem;
		background: var(--bg-base, #0b1020);
	}

	.glass-card {
		background: rgba(11, 16, 32, 0.6);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(148, 163, 184, 0.1);
		border-radius: 20px;
		padding: 2.5rem;
		width: 100%;
		max-width: 500px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.card-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.card-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.8rem;
		color: var(--text-main);
	}

	.card-header p {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.field-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	/* Input Styling */
	.field {
		margin-bottom: 1.5rem;
	}

	.field label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-main);
	}

	.text-accent {
		color: var(--primary);
	}

	.field input {
		width: 100%;
		padding: 0.85rem 1rem;
		background: rgba(15, 23, 42, 0.4);
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 10px;
		color: var(--text-main);
		transition: all 0.2s ease;
	}

	.field input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
		background: rgba(15, 23, 42, 0.8);
	}

	.error-box {
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 8px;
		color: #fca5a5;
		font-size: 0.9rem;
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.animation-pop-up {
		animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		animation-fill-mode: backwards;
	}

	@keyframes popUp {
		from { opacity: 0; transform: scale(0.95) translateY(20px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* Spinner Animation (Reused from evaluation) */
	.btn-spinner {
		animation: rotate 2s linear infinite;
		width: 20px;
		height: 20px;
		margin-right: 0.5rem;
	}
	.btn-spinner .path {
		stroke: #ffffff;
		stroke-linecap: round;
		animation: dash 1.5s ease-in-out infinite;
	}
	@keyframes rotate { 100% { transform: rotate(360deg); } }
	@keyframes dash {
		0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
		50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
		100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
	}
</style>