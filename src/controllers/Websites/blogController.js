import { Article } from '../../models/WebsiteSchecmas/WebsiteSchemas.js';


export const getArticles = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, category, search } = req.query;

        const filter = {};
        if (status !== undefined && status !== '' && status !== null) filter.status = status === 'true';
        if (category && category !== '') filter.category = category;

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [{ title: regex }, { description: regex }];
        }

        const articles = await Article.find(filter)
            .populate('category', 'name')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .select('-content');

        const total = await Article.countDocuments(filter);

        res.json({
            success: true,
            data: articles,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getArticle = async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug })
            .populate('category', 'name slug')

        if (!article) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }

        res.json({ success: true, data: article });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


export const createArticle = async (req, res) => {
    try {
        const { title, description, content, coverImage, category, meta, status = true, slug } = req.body;

        const existing = await Article.findOne({ slug });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Article with this title already exists' });
        }

        const article = await Article.create({
            title,
            slug,
            description,
            content,
            coverImage,
            category,
            meta,
            slug,
            status,
            createdBy: req.user?.id || null,
        });

        res.status(201).json({ success: true, data: article });
    } catch (error) {
        console.error('Create article error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Slug already in use' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content, coverImage, category, meta, status, slug } = req.body;

        const updateData = { description, content, coverImage, category, meta, status, slug };

        const article = await Article.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        })

        if (!article) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }

        res.json({ success: true, data: article });
    } catch (error) {
        console.error('Update article error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Slug already in use' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const deleteArticle = async (req, res) => {
    try {
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }
        res.json({ success: true, message: 'Article deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const toggleArticleStatus = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }
        article.status = !article.status;
        await article.save();
        res.json({ success: true, data: article });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};