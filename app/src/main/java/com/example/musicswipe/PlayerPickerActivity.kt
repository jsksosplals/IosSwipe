package com.example.musicswipe

import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.musicswipe.databinding.ActivityPlayerPickerBinding
import com.example.musicswipe.databinding.ItemPlayerBinding

class PlayerPickerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPlayerPickerBinding
    private lateinit var adapter: PlayerAdapter
    private lateinit var prefs: PlayerPrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPlayerPickerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = PlayerPrefs(this)

        adapter = PlayerAdapter { app ->
            prefs.selectedPackage = app.packageName
            prefs.selectedLabel = app.label
            Toast.makeText(this, getString(R.string.player_selected, app.label), Toast.LENGTH_SHORT).show()
            finish()
        }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter
    }

    override fun onResume() {
        super.onResume()
        loadActivePlayers()
    }

    private fun loadActivePlayers() {
        if (!MusicNotificationListenerService.isEnabled(this)) {
            Toast.makeText(this, R.string.enable_notification_access, Toast.LENGTH_LONG).show()
            adapter.submit(emptyList())
            return
        }

        val msm = getSystemService(MediaSessionManager::class.java)
        val component = MusicNotificationListenerService.component(this)

        val sessions: List<MediaController> = try {
            msm.getActiveSessions(component)
        } catch (e: SecurityException) {
            emptyList()
        }

        val pm = packageManager
        val apps = sessions.mapNotNull { session ->
            val pkg = session.packageName?.toString() ?: return@mapNotNull null
            val label = try {
                pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
            } catch (_: Exception) {
                pkg
            }
            PlayerApp(pkg, label)
        }.distinctBy { it.packageName }

        adapter.submit(apps)
    }

    data class PlayerApp(val packageName: String, val label: String)

    private class PlayerAdapter(
        private val onClick: (PlayerApp) -> Unit
    ) : RecyclerView.Adapter<PlayerAdapter.VH>() {

        private val items = mutableListOf<PlayerApp>()

        fun submit(newItems: List<PlayerApp>) {
            items.clear()
            items.addAll(newItems)
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val binding = ItemPlayerBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            return VH(binding)
        }

        override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(items[position])

        override fun getItemCount() = items.size

        inner class VH(private val binding: ItemPlayerBinding) :
            RecyclerView.ViewHolder(binding.root) {
            fun bind(item: PlayerApp) {
                binding.tvName.text = item.label
                binding.tvPackage.text = item.packageName
                binding.root.setOnClickListener { onClick(item) }
            }
        }
    }
}
