const Category = require('../models/category.model');

const INITIAL_CATEGORY_TREE = [
    {
        name: 'Books & Learning',
        slug: 'books-learning',
        description: 'Textbooks, reference books, study notes, and exam prep',
        icon: 'book',
        applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE', 'PRINTABLE_RESOURCE'],
        displayOrder: 1,
        children: [
            {
                name: 'Textbooks',
                slug: 'textbooks',
                description: 'Course textbooks and academic curriculum books',
                icon: 'book-open',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE'],
                children: [
                    {
                        name: 'New Textbooks',
                        slug: 'new-textbooks',
                        applicableListingTypes: ['VENDOR_PRODUCT']
                    },
                    {
                        name: 'Used Textbooks',
                        slug: 'used-textbooks',
                        applicableListingTypes: ['STUDENT_RESALE']
                    }
                ]
            },
            {
                name: 'Reference Books',
                slug: 'reference-books',
                description: 'Dictionaries, handbooks, and standard references',
                icon: 'bookmark',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Notes & Study Material',
                slug: 'notes-study-material',
                description: 'Student created and faculty approved notes',
                icon: 'file-text',
                applicableListingTypes: ['PRINTABLE_RESOURCE', 'STUDENT_RESALE'],
                children: [
                    {
                        name: 'Handwritten Notes',
                        slug: 'handwritten-notes',
                        applicableListingTypes: ['PRINTABLE_RESOURCE']
                    },
                    {
                        name: 'Typed Notes',
                        slug: 'typed-notes',
                        applicableListingTypes: ['PRINTABLE_RESOURCE']
                    },
                    {
                        name: 'Revision Sheets',
                        slug: 'revision-sheets',
                        applicableListingTypes: ['PRINTABLE_RESOURCE']
                    },
                    {
                        name: 'Practice Papers',
                        slug: 'practice-papers',
                        applicableListingTypes: ['PRINTABLE_RESOURCE']
                    },
                    {
                        name: 'Lab-Record Templates',
                        slug: 'lab-record-templates',
                        applicableListingTypes: ['PRINTABLE_RESOURCE']
                    }
                ]
            },
            {
                name: 'Exam Preparation',
                slug: 'exam-preparation',
                description: 'Competitive exam and semester question banks',
                icon: 'award',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE', 'PRINTABLE_RESOURCE']
            }
        ]
    },
    {
        name: 'Calculators & Electronics',
        slug: 'calculators-electronics',
        description: 'Calculators, peripherals, and student electronic gear',
        icon: 'cpu',
        applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE'],
        displayOrder: 2,
        children: [
            {
                name: 'Scientific Calculators',
                slug: 'scientific-calculators',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Basic Calculators',
                slug: 'basic-calculators',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Electronic Accessories',
                slug: 'electronic-accessories',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Used Electronics',
                slug: 'used-electronics',
                applicableListingTypes: ['STUDENT_RESALE']
            }
        ]
    },
    {
        name: 'Engineering & Lab',
        slug: 'engineering-lab',
        description: 'Drafting tools, lab coats, and engineering equipment',
        icon: 'tool',
        applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE'],
        displayOrder: 3,
        children: [
            {
                name: 'Drawing Instruments',
                slug: 'drawing-instruments',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Engineering Kits',
                slug: 'engineering-kits',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Lab Coats',
                slug: 'lab-coats',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Lab Supplies',
                slug: 'lab-supplies',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Project Components',
                slug: 'project-components',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            }
        ]
    },
    {
        name: 'Stationery',
        slug: 'stationery',
        description: 'Daily campus stationery, pens, notebooks, and binders',
        icon: 'edit-3',
        applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE'],
        displayOrder: 4,
        children: [
            {
                name: 'Notebooks',
                slug: 'notebooks',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Pens',
                slug: 'pens',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Planners',
                slug: 'planners',
                applicableListingTypes: ['VENDOR_PRODUCT']
            },
            {
                name: 'Sticky Notes',
                slug: 'sticky-notes',
                applicableListingTypes: ['VENDOR_PRODUCT']
            },
            {
                name: 'Art Supplies',
                slug: 'art-supplies',
                applicableListingTypes: ['VENDOR_PRODUCT', 'STUDENT_RESALE']
            },
            {
                name: 'Desk Accessories',
                slug: 'desk-accessories',
                applicableListingTypes: ['VENDOR_PRODUCT']
            }
        ]
    },
    {
        name: 'Premium Stationery',
        slug: 'premium-stationery',
        description: 'Japanese-inspired washi notebooks, fountain pens, and desk craft',
        icon: 'feather',
        applicableListingTypes: ['VENDOR_PRODUCT'],
        displayOrder: 5,
        children: [
            {
                name: 'Japanese-Inspired Notebooks',
                slug: 'japanese-inspired-notebooks',
                applicableListingTypes: ['VENDOR_PRODUCT']
            },
            {
                name: 'Premium Pens',
                slug: 'premium-pens',
                applicableListingTypes: ['VENDOR_PRODUCT']
            },
            {
                name: 'Luxury Planners',
                slug: 'luxury-planners',
                applicableListingTypes: ['VENDOR_PRODUCT']
            },
            {
                name: 'Desk Accessories',
                slug: 'premium-desk-accessories',
                applicableListingTypes: ['VENDOR_PRODUCT']
            }
        ]
    }
];

const seedCategoriesRecursive = async (nodes, parentId = null, level = 0) => {
    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        let category = await Category.findOne({ slug: node.slug });
        if (!category) {
            category = await Category.create({
                name: node.name,
                slug: node.slug,
                description: node.description || `${node.name} category`,
                parentId,
                level,
                applicableListingTypes: node.applicableListingTypes,
                icon: node.icon,
                isActive: true,
                displayOrder: node.displayOrder !== undefined ? node.displayOrder : index + 1
            });
        }
        if (node.children && node.children.length > 0) {
            await seedCategoriesRecursive(node.children, category._id, level + 1);
        }
    }
};

const ensureDefaultCategories = async () => {
    const count = await Category.countDocuments();
    if (count === 0) {
        await seedCategoriesRecursive(INITIAL_CATEGORY_TREE);
    }
};

module.exports = {
    INITIAL_CATEGORY_TREE,
    seedCategoriesRecursive,
    ensureDefaultCategories
};
