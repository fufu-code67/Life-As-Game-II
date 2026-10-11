import { mount } from 'svelte';
import Today from '@ui/Today.svelte';
import '@ui/app.css';

mount(Today, { target: document.getElementById('app')! });
