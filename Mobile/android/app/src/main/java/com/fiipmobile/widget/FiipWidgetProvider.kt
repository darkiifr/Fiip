package com.fiipmobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.fiipmobile.R
import org.json.JSONObject

class FiipWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      updateWidget(context, appWidgetManager, appWidgetId)
    }
  }

  companion object {
    private const val PREFS_NAME = "fiipWidgetPrefs"
    private const val WIDGET_DATA_KEY = "widgetData"

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val summaryComponent = ComponentName(context, FiipWidgetProvider::class.java)
      manager.getAppWidgetIds(summaryComponent).forEach { appWidgetId ->
        updateWidget(context, manager, appWidgetId)
      }
      val quickComponent = ComponentName(context, FiipQuickWidgetProvider::class.java)
      manager.getAppWidgetIds(quickComponent).forEach { appWidgetId ->
        updateQuickWidget(context, manager, appWidgetId)
      }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val snapshot = loadSnapshot(context)
      val views = RemoteViews(context.packageName, R.layout.fiip_widget)

      views.setTextViewText(R.id.fiip_widget_count, snapshot.totalNotes.toString())
      views.setTextViewText(R.id.fiip_widget_recent_title, snapshot.recentNoteTitle)
      views.setTextViewText(R.id.fiip_widget_recent_content, snapshot.recentNoteContent)
      views.setTextViewText(R.id.fiip_widget_favorites, "${snapshot.totalFavorites} favoris")
      views.setTextViewText(R.id.fiip_widget_locked, "${snapshot.lockedNotes} privees")

      views.setOnClickPendingIntent(R.id.fiip_widget_root, pendingIntent(context, "fiip://search", 100))
      views.setOnClickPendingIntent(R.id.fiip_widget_new_note, pendingIntent(context, "fiip://newNote", 101))

      manager.updateAppWidget(appWidgetId, views)
    }

    fun updateQuickWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val snapshot = loadSnapshot(context)
      val views = RemoteViews(context.packageName, R.layout.fiip_widget_quick)

      views.setTextViewText(R.id.fiip_quick_widget_count, "${snapshot.totalNotes} notes")
      views.setOnClickPendingIntent(R.id.fiip_quick_widget_root, pendingIntent(context, "fiip://search", 200))
      views.setOnClickPendingIntent(R.id.fiip_quick_widget_action, pendingIntent(context, "fiip://newNote", 201))

      manager.updateAppWidget(appWidgetId, views)
    }

    private fun pendingIntent(context: Context, url: String, requestCode: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    private fun loadSnapshot(context: Context): FiipWidgetSnapshot {
      val json = context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(WIDGET_DATA_KEY, null)

      if (json.isNullOrBlank()) return FiipWidgetSnapshot.empty()

      return runCatching {
        val data = JSONObject(json)
        FiipWidgetSnapshot(
          totalNotes = data.optInt("totalNotes", 0),
          totalFavorites = data.optInt("totalFavorites", 0),
          lockedNotes = data.optInt("lockedNotes", 0),
          attachmentNotes = data.optInt("attachmentNotes", 0),
          streakDays = data.optInt("streakDays", 0),
          lastActive = data.optString("lastActive", ""),
          recentNoteTitle = data.optString("recentNoteTitle", "Aucune note recente").ifBlank { "Aucune note recente" },
          recentNoteContent = data.optString("recentNoteContent", "Creez une note dans Fiip pour remplir ce widget.").ifBlank {
            "Creez une note dans Fiip pour remplir ce widget."
          },
          recentNoteUpdatedAt = data.optString("recentNoteUpdatedAt", "")
        )
      }.getOrDefault(FiipWidgetSnapshot.empty())
    }
  }
}

class FiipQuickWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      FiipWidgetProvider.updateQuickWidget(context, appWidgetManager, appWidgetId)
    }
  }
}

data class FiipWidgetSnapshot(
  val totalNotes: Int,
  val totalFavorites: Int,
  val lockedNotes: Int,
  val attachmentNotes: Int,
  val streakDays: Int,
  val lastActive: String,
  val recentNoteTitle: String,
  val recentNoteContent: String,
  val recentNoteUpdatedAt: String
) {
  companion object {
    fun empty() = FiipWidgetSnapshot(
      totalNotes = 0,
      totalFavorites = 0,
      lockedNotes = 0,
      attachmentNotes = 0,
      streakDays = 0,
      lastActive = "",
      recentNoteTitle = "Aucune note recente",
      recentNoteContent = "Creez une note dans Fiip pour remplir ce widget.",
      recentNoteUpdatedAt = ""
    )
  }
}
