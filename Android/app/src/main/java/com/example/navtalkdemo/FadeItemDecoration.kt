package com.example.navtalkdemo

import android.graphics.Canvas
import androidx.recyclerview.widget.RecyclerView

class FadeItemDecoration : RecyclerView.ItemDecoration() {
    override fun onDrawOver(c: Canvas, parent: RecyclerView, state: RecyclerView.State) {
        val childCount = parent.childCount
        val totalHeight = parent.height.toFloat()

        for (i in 0 until childCount) {
            val child = parent.getChildAt(i)

            val top = child.top.toFloat()
            val fadeHeight = totalHeight * 0.2f
            val alpha = when {
//                top < fadeHeight -> top / fadeHeight
                top < fadeHeight -> 0.2f
                else -> 1f
            }

            child.alpha = alpha
        }
    }
}
