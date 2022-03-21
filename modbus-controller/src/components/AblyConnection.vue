<script setup>
import Ably from 'ably'
import { ref } from '../../node_modules/vue'

const ably = new Ably.Realtime(import.meta.env.VITE_ABLY_KEY);
const channel = ably.channels.get('modBus');
const convoyeur_id = ref(1);
const position = ref('0');
const speed = ref('0');

const runPolo = (status) => {
  console.log('run',status)
  channel.publish('run', { convoyeur_id: convoyeur_id.value, status: status })
}

const stopPosition = () => {
  console.log('position', position.value)
  channel.publish('position', { convoyeur_id: convoyeur_id.value, position: parseInt(position.value) })
}

const postId = (postId) => {
  console.log('postId', postId)
  channel.publish('post_id', { convoyeur_id: convoyeur_id.value, post_id: postId })
}

const motorSpeed = () => {
  console.log('speed', speed.value)
  channel.publish('speed', { convoyeur_id: convoyeur_id.value, speed: parseInt(speed.value) })
}

</script>

<template> 
  <div>
    <h1>Modbus Controller</h1>
    <div>
      <h2>Convoyeur</h2>
      <button v-on:click="convoyeur_id = 1">Convoyeur 1</button>
      <button v-on:click="convoyeur_id = 2">Convoyeur 2</button>
      <p>Convoyeur {{convoyeur_id}}</p>
    </div>
    <div>
      <h2>Post</h2>
      <button v-on:click="postId(1)">Post 1</button>
      <button v-on:click="postId(2)">Post 2</button>
      <button v-on:click="postId(3)">Post 3</button>
    </div>
    <div>
      <h2>Demande de Marche</h2>
      <button v-on:click="runPolo(1)">Marche Sens 1</button>
      <button v-on:click="runPolo(2)">Marche Sens 2</button>
      <button v-on:click="runPolo(0)">Arret</button>
      <button v-on:click="runPolo(3)">Demande de positionnement sur une case</button>
    </div>
    <div>
      <h2>Choix position</h2>
      <div><input v-model="position" /></div>
      <button v-on:click="stopPosition">Valider</button>
    </div>
    <div>
      <h2>Speed</h2>
       <div><input v-model="speed"  type="range" min="0" max="100" step="10"></div>
       <p>{{speed}}%</p>
      <button v-on:click="motorSpeed">Valider</button>
    </div>
  </div>
</template>