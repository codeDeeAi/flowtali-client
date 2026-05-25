<script setup lang="ts">
import { useRoute } from 'vue-router'
import LetterheadEditor from './LetterheadEditor.vue'

const route = useRoute()
const projectId = route.query.project_id as string | undefined
</script>

<template>
  <LetterheadEditor mode="create" :project-id="projectId" />
</template>
