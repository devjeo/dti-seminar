<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data } = $props();

	let currentSection = $state('selection'); // 'selection', 'attendance', 'evaluation', 'success', 'completed'
	const DEFAULT_EVENT = 'Empowering Collaboration, Active Participation, and Professional Engagement Through Digital Tools';
	let selectedEvent = $state(DEFAULT_EVENT);
	let eventName = $state(DEFAULT_EVENT);

	let attendanceData: any = $state({});

	let isEvalOpen = $state(false);
	let evalMessage = $state('Checking evaluation schedule...');

	onMount(async () => {
		try {
			const res = await fetch('/api/evaluations/status');
			if (res.ok) {
				const data = await res.json();
				isEvalOpen = data.isOpen;
				evalMessage = data.message;
			} else {
				evalMessage = 'Evaluation schedule unavailable.';
			}
		} catch (error) {
			console.error("Failed to load schedule:", error);
			evalMessage = 'Network error checking schedule.';
		}
	});

	// State for modal
	let showModal = $state(false);
	let modalTitle = $state('');
	let modalMessage = $state('');
	let modalIcon = $state('');
	let modalType = $state('info'); // 'info', 'error', 'validation'

	function getDeviceId() {
		let deviceId = localStorage.getItem('device_id');
		if (!deviceId) {
			deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
			localStorage.setItem('device_id', deviceId);
		}
		return deviceId;
	}

	interface StatusData {
		attendance_completed: boolean;
		evaluation_completed: boolean;
		attendance_id?: string;
		attendee_name?: string;
	}

	async function checkServerStatus(deviceId: string, event: string): Promise<StatusData> {
		// Mocking server check for now. In real implementation, fetch from API.
		// const response = await fetch(`/api/check-status?device_id=${deviceId}&event=${event}`);
		// return await response.json();
		return { attendance_completed: false, evaluation_completed: false };
	}

	async function handleProceed() {
		if (!selectedEvent) return;

		const deviceId = getDeviceId();
		const completionKey = `eval_completed_${deviceId}_${selectedEvent}`;

		if (localStorage.getItem(completionKey) === 'true') {
			showModalDialog(
				'Already Completed',
				'You have already submitted an evaluation for this event.',
				'✅'
			);
			return;
		}

		// Mock status check
		const statusData = await checkServerStatus(deviceId, selectedEvent);

		if (statusData.attendance_completed && statusData.evaluation_completed) {
			localStorage.setItem(completionKey, 'true');
			currentSection = 'completed';
			return;
		}

		if (!statusData.attendance_completed) {
			eventName = selectedEvent;
			goto('/attendance');
			return;
		}

		// Logic for existing attendance but no evaluation... omitted for brevity in mock
		// ...
	}

	function isEvaluationTime() {
		const currentHour = new Date().getHours();
		// Check if within 5:00 PM to 6:00 PM window (17 to 18)
		// For demo purposes, returning true
		return true;
		// return (currentHour >= 17 && currentHour < 18);
	}

	function goBackToSelection() {
		currentSection = 'selection';
		// Reset forms logic would go here
	}

	async function submitAttendance(event: Event) {
		// Mock submission
		const formData = new FormData(event.target as HTMLFormElement);
		/*
        const response = await fetch('/api/attendance', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        */
		// Mock success
		const result = { success: true, attendance_id: '123' };

		if (result.success) {
			const firstName = formData.get('first_name') as string;
			const lastName = formData.get('last_name') as string;

			attendanceData = {
				firstName,
				lastName,
				eventName: selectedEvent,
				attendanceId: result.attendance_id
			};
			localStorage.setItem('lastAttendance', JSON.stringify(attendanceData));
			currentSection = 'success';
		} else {
			showModalDialog('Error', 'Registration Failed', '❌', 'error');
		}
	}

	function proceedToEvaluation() {
		if (!isEvalOpen) {
			showModalDialog('Evaluation Closed', evalMessage, '🕒', 'info');
			return;
		}
		currentSection = 'evaluation';
	}

	async function submitEvaluation(event: Event) {
		// Mock submission
		const formData = new FormData(event.target as HTMLFormElement);
		/*
        const response = await fetch('/api/evaluation', {
            method: 'POST',
            body: formData
        });
        */
		// Mock success
		const result = { success: true };

		if (result.success) {
			const deviceId = getDeviceId();
			const completionKey = `eval_completed_${deviceId}_${selectedEvent}`;
			localStorage.setItem(completionKey, 'true');
			localStorage.removeItem('lastAttendance');
			currentSection = 'completed';
		}
	}

	function showModalDialog(title: string, message: string, icon = '🔒', type = 'info') {
		modalTitle = title;
		modalMessage = message;
		modalIcon = icon;
		modalType = type;
		showModal = true;
	}
</script>

<svelte:head>
	<title>DTI Attendance & Evaluation</title>
</svelte:head>

<div class="app-container">
	<!-- Header Section -->
	<header class="app-header">
		<div class="logo-container">
			<div class="logo-box">
				<img src="/assets/logo_cnsc.png" alt="CNSC Logo" />
			</div>
			<div class="logo-box">
				<img src="/assets/ccms_logo.png" alt="CCMS Logo" />
			</div>
		</div>

		<div class="poster-container">
			<img
				src="/assets/theme.jpg"
				alt="Emerging Technologies in AI for Creative Industries - Poster"
			/>
		</div>
	</header>

	<!-- Main Selection Section -->
	{#if currentSection === 'selection'}
		<main class="card" id="selectionSection">
			<div class="field">
				<label for="eventSelector">Event</label>
				<div class="read-only-box">{selectedEvent}</div>
			</div>

			<div class="main-action">
				<button type="button" class="proceed-btn" onclick={handleProceed}>▶ PROCEED</button>

				<p class="subtitle" style="text-align: center;">
					Click PROCEED to register attendance or complete your evaluation.<br />
					<strong style="color: {isEvalOpen ? 'var(--accent-green)' : 'var(--accent-color)'};">
						{evalMessage}
					</strong>
				</p>
			</div>
		</main>
	{/if}

	<!-- Registration Section -->
	{#if currentSection === 'attendance'}
		<main class="card" id="registrationForm">
			<h3 class="part-header">Attendance Registration</h3>

			<form
				id="attendanceForm"
				onsubmit={(e) => {
					e.preventDefault();
					submitAttendance(e);
				}}
			>
				<div class="field-row">
					<div class="field">
						<label for="finalEventName">Selected Seminar</label>
						<input
							type="text"
							id="finalEventName"
							name="event_name"
							readonly
							class="read-only-box"
							value={eventName}
						/>
					</div>
					<div class="field">
						<label for="displayTime">Time-In</label>
						<input type="text" id="displayTime" name="time_in" readonly class="read-only-box" />
					</div>
				</div>

				<div class="field">
					<label for="titles">Full Name (Title, First, Middle, Last, Suffix)</label>
					<div class="full-name-row">
						<input type="text" name="title" placeholder="Title" list="titles" />
						<datalist id="titles">
							<option value="Mr."></option><option value="Ms."></option><option value="Mrs."
							></option><option value="Dr."></option><option value="Engr."></option><option
								value="Prof."
							>
							</option></datalist
						>

						<input
							type="text"
							id="firstName"
							name="first_name"
							placeholder="First Name *"
							required
						/>
						<input type="text" name="middle_name" placeholder="Middle Name" />
						<input type="text" name="last_name" placeholder="Last Name *" required />

						<select name="suffix">
							<option value="">Suffix</option>
							<option value="Jr.">Jr.</option>
							<option value="Sr.">Sr.</option>
							<option value="II">II</option>
							<option value="III">III</option>
							<option value="IV">IV</option>
						</select>
					</div>
				</div>

				<div class="field-row">
					<div class="field">
						<label for="sex">Sex</label>
						<select id="sex" name="sex" required>
							<option value="">Select Sex</option>
							<option value="M">Male</option>
							<option value="F">Female</option>
						</select>
					</div>
					<div class="field">
						<label for="age">Age</label>
						<input type="number" id="age" name="age" placeholder="Age" min="0" max="150" required />
					</div>
				</div>

				<div class="field-row">
					<div class="field">
						<label for="employer">Employer</label>
						<select id="employer" name="employer" required>
							<option value="">Select Employer</option>
							<option value="Private">Private</option>
							<option value="Government">Government</option>
							<option value="Self-Employed">Self-Employed</option>
							<option value="Unemployed">Unemployed</option>
							<option value="Student">Student</option>
						</select>
					</div>
					<div class="field">
						<label for="employment_status">Employment Status</label>
						<select id="employment_status" name="employment_status" required>
							<option value="">Select Status</option>
							<option value="Gov't Employee">Government Employee</option>
							<option value="Private Employee">Private Employee</option>
							<option value="Self-Employed">Self-Employed</option>
							<option value="None">None</option>
						</select>
					</div>
				</div>

				<div class="field-row">
					<div class="field">
						<label for="company">Company/Office</label>
						<input type="text" id="company" name="company" placeholder="Organization name" />
					</div>
					<div class="field">
						<label for="address">Complete Address</label>
						<input type="text" id="address" name="address" placeholder="Address" required />
					</div>
				</div>

				<div class="field">
					<label for="email">Email Address</label>
					<input type="email" id="email" name="email" placeholder="email@gmail.com" required />
				</div>

				<div class="field">
					<label for="c1">Social Classification (Check all that apply)</label>
					<div class="checkbox-group">
						<div class="checkbox-item">
							<input type="checkbox" name="classification[]" value="None" id="c1" /><label for="c1"
								>None</label
							>
						</div>
						<div class="checkbox-item">
							<input type="checkbox" name="classification[]" value="Abled" id="c2" /><label for="c2"
								>Abled</label
							>
						</div>
						<div class="checkbox-item">
							<input type="checkbox" name="classification[]" value="PWD" id="c3" /><label for="c3"
								>PWD</label
							>
						</div>
						<div class="checkbox-item">
							<input type="checkbox" name="classification[]" value="4PS" id="c4" /><label for="c4"
								>4PS</label
							>
						</div>
						<div class="checkbox-item">
							<input type="checkbox" name="classification[]" value="Youth" id="c5" /><label for="c5"
								>Youth</label
							>
						</div>
						<div class="checkbox-item">
							<input type="checkbox" name="classification[]" value="Senior Citizen" id="c6" /><label
								for="c6">Senior Citizen</label
							>
						</div>
						<div class="checkbox-item">
							<input type="checkbox" name="classification[]" value="IP" id="c7" /><label for="c7"
								>IP</label
							>
						</div>
						<div class="checkbox-item">
							<input type="checkbox" name="classification[]" value="OFW" id="c8" /><label for="c8"
								>OFW</label
							>
						</div>
					</div>
				</div>
				<div class="field">
					<input type="text" name="other_classification" placeholder="If others, please specify" />
				</div>

				<button type="submit" class="btn-primary">Confirm & Submit Attendance</button>
				<button
					type="button"
					class="back-btn"
					onclick={() => {
						goBackToSelection();
					}}>← Back</button
				>
			</form>
		</main>
	{/if}

	<!-- Attendance Success Section -->
	{#if currentSection === 'success'}
		<main class="card" id="attendanceSuccessSection" style="text-align: center;">
			<div style="margin-bottom: 24px;">
				<div style="font-size: 48px; margin-bottom: 12px;">✅</div>
				<h2 style="color: var(--accent-green); margin-bottom: 8px;">Attendance Recorded!</h2>
				<p class="subtitle">You can now proceed to evaluation.</p>
			</div>

			<button
				type="button"
				class="btn-evaluation"
				onclick={proceedToEvaluation}
				style="margin-top: 12px;">📋 Proceed to Evaluation</button
			>
			<button
				type="button"
				class="btn-primary"
				onclick={goBackToSelection}
				style="margin-top: 12px;">Back to Menu</button
			>
		</main>
	{/if}

	<!-- Evaluation Section -->
	{#if currentSection === 'evaluation'}
		<main class="card" id="evaluationForm">
			<form
				id="evaluationFormElement"
				onsubmit={(e) => {
					e.preventDefault();
					submitEvaluation(e);
				}}
			>
				<div class="field">
					<label for="evalEventName">Training Title</label>
					<input
						type="text"
						id="evalEventName"
						name="training_title"
						readonly
						class="read-only-box"
						value={eventName}
					/>
				</div>

				<div class="field">
					<label for="evalVenue">Venue</label>
					<input
						type="text"
						id="evalVenue"
						name="venue"
						readonly
						class="read-only-box"
						value="CCMS Lab 1, CNSC, Daet Camarines Norte"
					/>
				</div>

				<div class="field-row">
					<div class="field">
						<label for="evalDate">Date</label>
						<input
							type="date"
							id="evalDate"
							name="evaluation_date"
							value={new Date().toISOString().split('T')[0]}
							required
						/>
					</div>
					<div class="field">
						<label for="evalParticipantName">Participant Name</label>
						<input
							type="text"
							id="evalParticipantName"
							name="participant_name"
							readonly
							class="read-only-box"
							value={attendanceData.firstName
								? `${attendanceData.firstName} ${attendanceData.lastName}`
								: ''}
						/>
					</div>
				</div>

				<div
					style="text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-muted);"
				>
					Rating Scale: 5 (Excellent) to 1 (Poor)
				</div>

				<!-- PART 1: SPEAKER 1 -->
				<h3 class="part-header">Part I. Evaluation of the conduct of the training</h3>

				<div class="field" style="margin-bottom: 24px;">
					<label for="sp1">1. Resource Speaker 1 (Name)</label>
					<input
						type="text"
						id="sp1"
						name="speaker1_name"
						placeholder="Name of Speaker 1"
						required
					/>
				</div>

				<!-- Simplified Evaluation Cards for brevity in example, copying structure -->
				<div class="eval-card">
					<div class="eval-card-title">1.1 Achievement of session objectives</div>
					<div class="rating-options">
						{#each [5, 4, 3, 2, 1] as rate}
							<label class="radio-pill"
								><input type="radio" name="speaker1_q1" value={rate} required /><span>{rate}</span
								></label
							>
						{/each}
					</div>
				</div>
				<div class="eval-card">
					<div class="eval-card-title">1.2 Relevance of topic covered</div>
					<div class="rating-options">
						{#each [5, 4, 3, 2, 1] as rate}
							<label class="radio-pill"
								><input type="radio" name="speaker1_q2" value={rate} required /><span>{rate}</span
								></label
							>
						{/each}
					</div>
				</div>
				<!-- ... (Include other fields similarly if needed, or cut short for this demo) ... -->

				<button type="submit" class="btn-evaluation">Submit Evaluation</button>
				<button type="button" class="back-btn" onclick={goBackToSelection}>← Back</button>
			</form>
		</main>
	{/if}

	<!-- Completed Message -->
	{#if currentSection === 'completed'}
		<main class="card" id="completedMessage" style="text-align: center; padding: 60px 20px;">
			<div style="margin-bottom: 30px;">
				<div style="font-size: 60px; margin-bottom: 16px;">✅</div>
				<h2 style="color: var(--accent-green); margin-bottom: 8px; font-size: 24px;">
					Response Recorded
				</h2>
				<p class="subtitle">Your evaluation has been successfully submitted.</p>
			</div>

			<div
				style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent-green); border-radius: 8px; padding: 20px; margin-bottom: 24px;"
			>
				<p style="color: var(--text-main); font-weight: 500; margin-bottom: 8px;">
					Thank you for your feedback!
				</p>
				<p class="subtitle">This response has been locked and cannot be modified.</p>
			</div>

			<button
				class="btn-primary"
				onclick={() => window.location.reload()}
				style="background: var(--accent-color);">Start New Session</button
			>
		</main>
	{/if}
</div>

<!-- Modal Dialog -->
{#if showModal}
	<div class="modal-overlay active">
		<div class="modal-dialog">
			<div class="modal-icon">{modalIcon}</div>
			<div class="modal-title" style={modalType === 'error' ? 'color: #d32f2f;' : ''}>
				{modalTitle}
			</div>
			<div class="modal-message">{modalMessage}</div>
			<div class="modal-actions">
				<button class="modal-btn-primary" onclick={() => (showModal = false)}>OK</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

	:root {
		--bg-color: #061224;
		--card-bg: #0b1d3a;
		--card-border: #1e365d;
		--input-bg: #040c17;
		--input-border: #2a436e;
		--text-main: #f8fafc;
		--text-muted: #94a3b8;
		--accent-color: #ffd600;
		--accent-hover: #e5c000;
		--btn-text: #000000;
		--accent-green: #10b981;
		--accent-green-hover: #059669;
	}

	/* Wrap details in global or scoped */
	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		background: #061224;
		color: var(--text-main);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.app-container {
		width: 100%;
		max-width: 800px;
		padding: 24px 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	* {
		box-sizing: border-box;
	}

	/* --- Header & Logos --- */
	.app-header {
		width: 100%;
		text-align: center;
		margin-bottom: 24px;
	}

	.logo-container {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 24px;
		margin-bottom: 24px;
	}

	.logo-box {
		width: 85px;
		height: 85px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent-color);
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.logo-box img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	/* --- Poster Banner --- */
	.poster-container {
		width: 100%;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid var(--card-border);
		box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);
		margin-bottom: 24px;
		background: var(--card-bg);
	}

	.poster-container img {
		width: 100%;
		height: auto;
		display: block;
		object-fit: cover;
	}

	/* --- Main Layout --- */
	.card {
		background: transparent;
		width: 100%;
		max-width: 800px;
	}

	h2 {
		font-size: 20px;
		font-weight: 600;
		margin-bottom: 8px;
		color: var(--text-main);
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 14px;
		margin-bottom: 24px;
		line-height: 1.5;
	}

	/* --- Forms & Inputs --- */
	.field {
		margin-bottom: 16px;
	}

	.field-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
	}

	.full-name-row {
		display: grid;
		grid-template-columns: 80px 1fr 1fr 1fr 80px;
		gap: 10px;
	}

	@media (max-width: 768px) {
		.full-name-row {
			grid-template-columns: 1fr;
		}
	}

	label {
		display: block;
		color: var(--text-main);
		font-size: 13px;
		font-weight: 500;
		margin-bottom: 8px;
	}

	input[type='text'],
	input[type='number'],
	input[type='email'],
	input[type='date'],
	select,
	textarea {
		width: 100%;
		background: rgba(4, 12, 23, 0.5);
		border: 1px solid var(--input-border);
		border-radius: 8px;
		padding: 12px 14px;
		color: var(--text-main);
		font-size: 14px;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: var(--accent-color);
	}

	.read-only-box {
		background: rgba(4, 12, 23, 0.8) !important;
		color: var(--accent-color) !important;
		cursor: not-allowed;
		font-family: monospace;
		font-size: 15px !important;
	}

	/* --- Checkboxes --- */
	.checkbox-group {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 12px;
		margin-top: 10px;
	}

	.checkbox-item {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-main);
		font-size: 14px;
	}

	.checkbox-item input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: var(--accent-color);
	}

	/* --- NEW EVALUATION CARD UI --- */
	.part-header {
		color: var(--accent-color);
		font-size: 16px;
		font-weight: 700;
		margin: 40px 0 16px 0;
		text-transform: uppercase;
		border-bottom: 1px solid var(--card-border);
		padding-bottom: 8px;
		letter-spacing: 0.5px;
	}

	.eval-card {
		border: 1px solid var(--input-border);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 16px;
		background: rgba(4, 12, 23, 0.4);
	}

	.eval-card-title {
		color: var(--text-main);
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.eval-card-subtitle {
		color: var(--text-muted);
		font-size: 12px;
		margin-bottom: 16px;
		font-style: italic;
	}

	.rating-options {
		display: flex;
		gap: 8px;
		justify-content: space-between;
	}

	.radio-pill {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px 0;
		border: 1px solid var(--input-border);
		border-radius: 24px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-muted);
		transition: all 0.2s ease;
		background: rgba(255, 255, 255, 0.02);
		-webkit-tap-highlight-color: transparent;
	}

	.radio-pill input[type='radio'] {
		display: none;
	}

	.radio-pill:has(input:checked) {
		background: var(--accent-color);
		color: var(--btn-text);
		border-color: var(--accent-color);
		font-weight: 700;
		box-shadow: 0 4px 10px rgba(255, 214, 0, 0.3);
	}

	/* --- Buttons --- */
	.btn-primary,
	.btn-evaluation,
	.btn-attendance {
		width: 100%;
		background: var(--accent-color);
		color: var(--btn-text);
		border: none;
		border-radius: 8px;
		padding: 16px;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.2s;
		margin-top: 24px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.btn-primary:hover {
		background: var(--accent-hover);
	}

	.btn-evaluation {
		background: var(--accent-green);
		color: #ffffff;
	}
	.btn-evaluation:hover {
		background: var(--accent-green-hover);
	}

	.back-btn {
		background: transparent;
		color: var(--text-muted);
		border: 1px solid var(--input-border);
		border-radius: 8px;
		padding: 14px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		width: 100%;
		transition: all 0.2s;
		margin-top: 16px;
	}
	.back-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-main);
	}

	@media (max-width: 640px) {
		/* Prevent zoom on iOS */
		input[type='text'],
		input[type='number'],
		input[type='email'],
		input[type='date'],
		select,
		textarea {
			font-size: 16px;
		}

		.proceed-btn {
			padding: 16px 24px;
			font-size: 16px;
			width: 100%;
		}

		.header-title {
			font-size: 1.5rem;
		}

		.logo-box {
			width: 60px;
			height: 60px;
		}
	}

	/* --- Main Action Button --- */
	.main-action {
		margin: 32px 0;
		text-align: center;
	}

	.proceed-btn {
		background: var(--accent-green);
		color: white;
		border: none;
		border-radius: 50px;
		padding: 20px 40px;
		font-size: 20px;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.3s ease;
		text-transform: uppercase;
		letter-spacing: 2px;
		box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
	}

	.proceed-btn:hover {
		background: var(--accent-green-hover);
		transform: translateY(-2px);
		box-shadow: 0 15px 30px rgba(16, 185, 129, 0.4);
	}

	.proceed-btn:active {
		transform: translateY(0);
	}

	.time-indicator {
		background: rgba(255, 214, 0, 0.1);
		border: 1px solid var(--accent-color);
		border-radius: 8px;
		padding: 12px;
		margin: 20px 0;
		text-align: center;
		font-size: 14px;
	}

	.time-indicator .highlight {
		color: var(--accent-color);
		font-weight: 700;
	}

	/* --- Modal Dialog --- */
	.modal-overlay {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		z-index: 1000;
		align-items: center;
		justify-content: center;
	}

	.modal-overlay.active {
		display: flex;
	}

	.modal-dialog {
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: 16px;
		padding: 32px;
		max-width: 400px;
		width: 90%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
		text-align: center;
	}

	.modal-icon {
		font-size: 48px;
		margin-bottom: 16px;
	}

	.modal-title {
		color: var(--accent-color);
		font-size: 18px;
		font-weight: 700;
		margin-bottom: 12px;
		text-transform: uppercase;
	}

	.modal-message {
		color: var(--text-main);
		font-size: 14px;
		line-height: 1.6;
		margin-bottom: 24px;
		white-space: pre-line;
	}

	.modal-actions {
		display: flex;
		gap: 12px;
	}

	.modal-actions button {
		flex: 1;
		padding: 12px 16px;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.modal-btn-primary {
		background: var(--accent-color);
		color: var(--btn-text);
	}

	.modal-btn-primary:hover {
		background: var(--accent-hover);
	}
</style>
