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
		// If they already have an active profile on this device, send to hub
		const storedId = localStorage.getItem('dti_locked_guest_id');
		if (storedId) {
			goto('/');
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;
		errorMessage = '';

		try {
			const res = await fetch('/api/guests', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			});

			if (res.ok) {
				const data = await res.json();
				
				// Lock the device to this new guest profile
				localStorage.setItem('dti_locked_guest_id', data.guest.guestId);
				
				// Route back to the homepage so they can proceed to Step 2
				goto('/');
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
	<title>Registration | DTI</title>
</svelte:head>

<main class="register-container">
	<div class="glass-card animation-pop-up">
		<div class="card-header">
			<h2>Registration</h2>
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
					Register
				{/if}
			</button>
			
			<!-- Added Escape Hatch -->
			<button type="button" class="back-link" onclick={() => goto('/')} disabled={isSubmitting}>
				&larr; Back to Homepage
			</button>
		</form>
	</div>
</main>

<style>
	/* =========================================
	   Registration Specific Layout
	   ========================================= */
	
	:global(html),
	:global(body) {
		background: var(--bg-color, #050814);
	}

	.register-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 1rem;
	}

	.glass-card {
		background: rgba(11, 16, 32, 0.6);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(148, 163, 184, 0.1);
		border-radius: 24px;
		padding: 3rem 2.5rem;
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

	/* Mapped to Golden Yellow for high contrast */
	.text-accent {
		color: var(--accent); 
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
		/* Swapped hardcoded indigo for dynamic maroon glow */
		box-shadow: 0 0 0 3px var(--primary-soft); 
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

	/* New Back Link Styling */
	.back-link {
		display: block;
		width: 100%;
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.95rem;
		margin-top: 1rem;
		padding: 0.75rem;
		cursor: pointer;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--text-main);
	}

	.animation-pop-up {
		animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		animation-fill-mode: backwards;
	}

	@keyframes popUp {
		from { opacity: 0; transform: scale(0.95) translateY(20px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* Spinner Animation */
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