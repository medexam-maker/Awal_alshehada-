#!/bin/bash

# ==============================================================================
# سكربت المزامنة والسحب الآمن من GitHub لكتالوج تطبيق "أول الشهادة"
# GitHub Sync & Safe Pull Script for "Awal Al-Shehada" App
# ==============================================================================

set -e

REPO_URL=$1

echo "=========================================="
echo "🔄 بدء إعداد ومزامنة المستودع مع GitHub..."
echo "=========================================="

# 1. التأكد من تهيئة git
if [ ! -d ".git" ]; then
    echo "📌 تهيئة مستودع Git المحلي..."
    git init
    git branch -M main
fi

# 2. تعيين المستودع البعيد إذا تم تمريره
if [ -n "$REPO_URL" ]; then
    echo "🔗 ربط المستودع البعيد: $REPO_URL"
    if git remote get-url origin > /dev/null 2>&1; then
        git remote set-url origin "$REPO_URL"
    else
        git remote add origin "$REPO_URL"
    fi
fi

# 3. التحقق من وجود origin
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️ لم يتم تحديد رابط مستودع GitHub."
    echo "💡 الاستخدام: ./scripts/sync-github.sh https://github.com/USERNAME/REPO_NAME.git"
    exit 1
fi

# 4. حفظ التغييرات المحلية مؤقتاً لتجنب فقدان أي ملفات تم إنشاؤها
echo "💾 حفظ النسخة المحلية الحالية مؤقتاً (Stash)..."
git add .
git stash save "Local backup before GitHub pull - $(date)" || true

# 5. جلب الفروع والبيانات من GitHub
echo "📡 جلب البيانات والملفات من GitHub (git fetch)..."
git fetch origin

# 6. تحديد الفرع الأساسي (main أو master)
DEFAULT_BRANCH="main"
if git show-ref --verify --quiet refs/remotes/origin/main; then
    DEFAULT_BRANCH="main"
elif git show-ref --verify --quiet refs/remotes/origin/master; then
    DEFAULT_BRANCH="master"
fi

echo "🌿 الفرع المستهدف: $DEFAULT_BRANCH"

# 7. دمج الملفات أو السحب
echo "📥 سحب الملفات ودمجها مع الملفات الحالية..."
git checkout -B "$DEFAULT_BRANCH" "origin/$DEFAULT_BRANCH" || git pull origin "$DEFAULT_BRANCH" --allow-unrelated-histories -X ours

# 8. استعادة التغييرات المحلية دون مسح الملفات المسحوبة
echo "🔄 إعادة التغييرات والأسئلة المحلية المحدثة (Stash Pop)..."
git stash pop || echo "ℹ️ لا توجد تعارضات محتملة أو تم الدمج بنجاح."

echo "=========================================="
echo "✅ تمت عملية المزامنة والسحب بنجاح!"
echo "📁 جميع الملفات جاهزة ومحفوظة."
echo "=========================================="
